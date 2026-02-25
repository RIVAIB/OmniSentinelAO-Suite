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
    const supabase = createClient();

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

    const { mode, targetAgent } = parseDirective(message);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, data: any) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            const systemContext = session.project_context || '';
            const formattedHistory = history?.map(m => ({
                role: m.role === 'richard' ? 'user' : 'assistant',
                content: m.content
            })) || [];

            if (mode === 'direct' && targetAgent) {
                send('agent_start', { agent: targetAgent });
                const systemPrompt = targetAgent === 'claude' ? CLAUDE_SYSTEM(systemContext) : GEMINI_SYSTEM(systemContext);
                const streamFn = targetAgent === 'claude' ? streamClaudeResponse : streamGeminiResponse;

                let fullResponse = '';
                await streamFn(
                    systemPrompt,
                    formattedHistory,
                    (token) => {
                        send('token', { token });
                        fullResponse += token;
                    },
                    async (toolName, args) => {
                        send('tool_start', { toolName, args });
                        const result = await executeMCPTool(sessionId, toolName, args);
                        send('tool_complete', { toolName, result });
                    }
                );

                const { data: agentMsg } = await supabase
                    .from('messages')
                    .insert({
                        session_id: sessionId,
                        role: targetAgent,
                        content: fullResponse,
                    })
                    .select()
                    .single();

                send('agent_complete', { agent: targetAgent, messageId: agentMsg.id });
            }

            if (mode === 'debate') {
                const firstAgent = determineFirstResponder(message);
                const secondAgent = firstAgent === 'claude' ? 'gemini' : 'claude';

                // --- FIRST RESPONDER ---
                send('agent_start', { agent: firstAgent });
                const firstSystemPrompt = firstAgent === 'claude' ? CLAUDE_SYSTEM(systemContext) : GEMINI_SYSTEM(systemContext);
                const firstStreamFn = firstAgent === 'claude' ? streamClaudeResponse : streamGeminiResponse;

                let firstResponse = '';
                await firstStreamFn(
                    firstSystemPrompt,
                    formattedHistory,
                    (token) => {
                        send('token', { token });
                        firstResponse += token;
                    },
                    async (toolName, args) => {
                        send('tool_start', { toolName, args });
                        const result = await executeMCPTool(sessionId, toolName, args);
                        send('tool_complete', { toolName, result });
                    }
                );

                const { data: msg1 } = await supabase
                    .from('messages')
                    .insert({
                        session_id: sessionId,
                        role: firstAgent,
                        content: firstResponse,
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
                await secondStreamFn(
                    secondSystemPrompt,
                    historyWithCrossCheck,
                    (token) => {
                        send('token', { token });
                        secondResponse += token;
                    },
                    async (toolName, args) => {
                        send('tool_start', { toolName, args });
                        const result = await executeMCPTool(sessionId, toolName, args);
                        send('tool_complete', { toolName, result });
                    }
                );

                const { status, detail } = parseCrossCheckStatus(secondResponse);

                const { data: msg2 } = await supabase
                    .from('messages')
                    .insert({
                        session_id: sessionId,
                        role: secondAgent,
                        content: secondResponse,
                        cross_check_status: status,
                        cross_check_detail: detail,
                    })
                    .select()
                    .single();

                send('agent_complete', { agent: secondAgent, messageId: msg2.id, crossCheck: { status, detail } });
            }

            controller.close();
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
