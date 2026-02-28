import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { streamClaudeResponse } from '@/lib/agents/claude';
import { streamGeminiResponse } from '@/lib/agents/gemini';
import { determineFirstResponder, parseDirective } from '@/lib/agents/orchestrator';
import { CLAUDE_SYSTEM } from '@/lib/prompts/claude-system';
import { GEMINI_SYSTEM } from '@/lib/prompts/gemini-system';
import { buildCrossCheckContext, parseCrossCheckStatus } from '@/lib/agents/cross-checker';
import { executeMCPTool } from '@/lib/mcp/executor';
import { AgentRole } from '@/lib/types/messages';

export async function POST(req: NextRequest) {
    const { sessionId, message } = await req.json();
    const supabase = await createClient();

    // 1. Get session and user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    // 2. Save Richard's message
    const { data: userMsg } = await supabase
        .from('messages')
        .insert({
            session_id: sessionId,
            role: 'richard',
            content: message,
        })
        .select()
        .single();

    // 3. Get history
    const { data: history } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    // 4. Sliding Window: Limit history to last 30 messages
    const MAX_HISTORY = 30;
    const rawHistory = history?.slice(-MAX_HISTORY) || [];
    // Gemini requires the first message in history to be 'user' role.
    // If the window cuts in the middle of a turn, trim leading agent messages.
    const firstUserIdx = rawHistory.findIndex(m => m.role === 'richard');
    const recentHistory = firstUserIdx > 0 ? rawHistory.slice(firstUserIdx) : rawHistory;

    const { mode, targetAgent } = parseDirective(message);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, data: any) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            const systemContext = session.project_context || '';
            // Identity Preservation: Prefix agent messages so AI knows who said what
            const formattedHistory = recentHistory.map(m => ({
                role: m.role === 'richard' ? 'user' : 'assistant',
                content: m.role === 'richard' ? m.content : `[${m.role.toUpperCase()}]: ${m.content}`
            })) || [];

            const MAX_TOOL_ROUNDS = 5;

            try {

                if (mode === 'direct' && targetAgent) {
                    send('agent_start', { agent: targetAgent });
                    const systemPrompt = targetAgent === 'claude' ? CLAUDE_SYSTEM(systemContext) : GEMINI_SYSTEM(systemContext);
                    const streamFn = targetAgent === 'claude' ? streamClaudeResponse : streamGeminiResponse;

                    let fullResponse = '';
                    const startTime = Date.now();
                    let currentMessages = [...formattedHistory];
                    let toolRound = 0;

                    const runAgent = async () => {
                        await streamFn(
                            systemPrompt,
                            currentMessages,
                            (token) => {
                                send('token', { token });
                                fullResponse += token;
                            },
                            async (toolName, args, toolId) => {
                                toolRound++;
                                if (toolRound > MAX_TOOL_ROUNDS) {
                                    send('error', { message: 'Límite de herramientas alcanzado (max 5 rondas)' });
                                    return;
                                }
                                send('tool_start', { toolName, args });
                                const result = await executeMCPTool(sessionId, toolName, args);
                                send('tool_complete', { toolName, result });

                                // Reinject for Claude
                                if (targetAgent === 'claude' && toolId) {
                                    currentMessages.push({
                                        role: 'assistant',
                                        content: [{ type: 'tool_use', id: toolId, name: toolName, input: args }] as any
                                    });
                                    currentMessages.push({
                                        role: 'user',
                                        content: [{ type: 'tool_result', tool_use_id: toolId, content: JSON.stringify(result) }] as any
                                    });
                                    await runAgent();
                                }
                                // Reinject for Gemini
                                if (targetAgent === 'gemini') {
                                    currentMessages.push({
                                        role: 'assistant',
                                        content: fullResponse // Text so far
                                    });
                                    currentMessages.push({
                                        role: 'user',
                                        content: `Resultado de ${toolName}: ${JSON.stringify(result)}`
                                    });
                                    await runAgent();
                                }
                            }
                        );
                    };

                    await runAgent();

                    const { data: agentMsg } = await supabase
                        .from('messages')
                        .insert({
                            session_id: sessionId,
                            role: targetAgent,
                            content: fullResponse,
                            metadata: {
                                model: targetAgent === 'claude' ? 'claude-sonnet-4-6' : 'gemini-2.5-flash',
                                latency_ms: Date.now() - startTime
                            }
                        })
                        .select()
                        .single();

                    send('agent_complete', { agent: targetAgent, messageId: agentMsg.id });
                }

                if (mode === 'debate') {
                    const lastAgent = history?.filter(m => m.role === 'claude' || m.role === 'gemini').pop()?.role;
                    const firstAgent = determineFirstResponder(message, lastAgent as AgentRole);
                    const secondAgent = firstAgent === 'claude' ? 'gemini' : 'claude';

                    // --- FIRST RESPONDER ---
                    send('agent_start', { agent: firstAgent });
                    const firstSystemPrompt = firstAgent === 'claude' ? CLAUDE_SYSTEM(systemContext) : GEMINI_SYSTEM(systemContext);
                    const firstStreamFn = firstAgent === 'claude' ? streamClaudeResponse : streamGeminiResponse;

                    let firstResponse = '';
                    const startTime1 = Date.now();
                    let firstMessages = [...formattedHistory];
                    let toolRound1 = 0;

                    const runFirstAgent = async () => {
                        await firstStreamFn(
                            firstSystemPrompt,
                            firstMessages,
                            (token) => {
                                send('token', { token });
                                firstResponse += token;
                            },
                            async (toolName, args, toolId) => {
                                toolRound1++;
                                if (toolRound1 > MAX_TOOL_ROUNDS) {
                                    send('error', { message: 'Límite de herramientas alcanzado' });
                                    return;
                                }
                                send('tool_start', { toolName, args });
                                const result = await executeMCPTool(sessionId, toolName, args);
                                send('tool_complete', { toolName, result });

                                if (firstAgent === 'claude' && toolId) {
                                    firstMessages.push({
                                        role: 'assistant',
                                        content: [{ type: 'tool_use', id: toolId, name: toolName, input: args }] as any
                                    });
                                    firstMessages.push({
                                        role: 'user',
                                        content: [{ type: 'tool_result', tool_use_id: toolId, content: JSON.stringify(result) }] as any
                                    });
                                    await runFirstAgent();
                                }
                                if (firstAgent === 'gemini') {
                                    firstMessages.push({ role: 'assistant', content: firstResponse });
                                    firstMessages.push({ role: 'user', content: `Resultado de ${toolName}: ${JSON.stringify(result)}` });
                                    await runFirstAgent();
                                }
                            }
                        );
                    };

                    await runFirstAgent();

                    const { data: msg1 } = await supabase
                        .from('messages')
                        .insert({
                            session_id: sessionId,
                            role: firstAgent,
                            content: firstResponse,
                            metadata: {
                                model: firstAgent === 'claude' ? 'claude-sonnet-4-6' : 'gemini-2.5-flash',
                                latency_ms: Date.now() - startTime1
                            }
                        })
                        .select()
                        .single();

                    send('agent_complete', { agent: firstAgent, messageId: msg1.id });

                    // --- SECOND RESPONDER (CROSS-CHECK) ---
                    send('agent_start', { agent: secondAgent, isCrossCheck: true });
                    const secondSystemPrompt = secondAgent === 'claude' ? CLAUDE_SYSTEM(systemContext) : GEMINI_SYSTEM(systemContext);
                    const secondStreamFn = secondAgent === 'claude' ? streamClaudeResponse : streamGeminiResponse;

                    // Inject cross-check context
                    const crossCheckPrompt = buildCrossCheckContext(firstResponse, firstAgent);
                    const historyWithCrossCheck = [...formattedHistory, { role: 'user', content: crossCheckPrompt }];

                    let secondResponse = '';
                    const startTime2 = Date.now();
                    let secondMessages = [...historyWithCrossCheck];
                    let toolRound2 = 0;

                    const runSecondAgent = async () => {
                        await secondStreamFn(
                            secondSystemPrompt,
                            secondMessages,
                            (token) => {
                                send('token', { token });
                                secondResponse += token;
                            },
                            async (toolName, args, toolId) => {
                                toolRound2++;
                                if (toolRound2 > MAX_TOOL_ROUNDS) {
                                    send('error', { message: 'Límite de herramientas alcanzado' });
                                    return;
                                }
                                send('tool_start', { toolName, args });
                                const result = await executeMCPTool(sessionId, toolName, args);
                                send('tool_complete', { toolName, result });

                                if (secondAgent === 'claude' && toolId) {
                                    secondMessages.push({
                                        role: 'assistant',
                                        content: [{ type: 'tool_use', id: toolId, name: toolName, input: args }] as any
                                    });
                                    secondMessages.push({
                                        role: 'user',
                                        content: [{ type: 'tool_result', tool_use_id: toolId, content: JSON.stringify(result) }] as any
                                    });
                                    await runSecondAgent();
                                }
                                if (secondAgent === 'gemini') {
                                    secondMessages.push({ role: 'assistant', content: secondResponse });
                                    secondMessages.push({ role: 'user', content: `Resultado de ${toolName}: ${JSON.stringify(result)}` });
                                    await runSecondAgent();
                                }
                            }
                        );
                    };

                    await runSecondAgent();

                    const { status, detail } = parseCrossCheckStatus(secondResponse);

                    const { data: msg2 } = await supabase
                        .from('messages')
                        .insert({
                            session_id: sessionId,
                            role: secondAgent,
                            content: secondResponse,
                            cross_check_status: status,
                            cross_check_detail: detail,
                            metadata: {
                                model: secondAgent === 'claude' ? 'claude-sonnet-4-6' : 'gemini-2.5-flash',
                                latency_ms: Date.now() - startTime2
                            }
                        })
                        .select()
                        .single();

                    send('agent_complete', { agent: secondAgent, messageId: msg2.id, crossCheck: { status, detail } });
                }

            } catch (error: any) {
                console.error('Chat API Error:', error);
                send('error', { message: error.message });
            } finally {
                // Update session timestamp so sidebar sorts correctly
                await supabase
                    .from('sessions')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', sessionId);
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
