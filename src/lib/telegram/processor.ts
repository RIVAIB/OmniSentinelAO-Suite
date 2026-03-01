// src/lib/telegram/processor.ts
// Async message processor: parses update, routes to agent or LLM, replies.

import { sendMessage } from './client';
import { transcribeVoice } from './voice';
import { detectAgentMention } from './agent-parser';
import { processMessage, createConversation, getAgentByName } from '@/lib/ai/agent-service';
import { createClient } from '@/lib/supabase/server';
import type { TelegramUpdate, BotIdentity } from './types';

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(text: string): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(text);
    return result.response.text();
}

// ── Claude general (without OmniSentinel agent routing) ───────────────────────

async function callClaude(text: string): Promise<string> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: text }],
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
}

// ── CLAWDIO orchestrator report ───────────────────────────────────────────────

async function clawdioReport(userMessage: string, contactId: string): Promise<string> {
    const supabase = await createClient();

    const { data: missions } = await supabase
        .from('missions')
        .select('title, status, priority, agents(name)')
        .in('status', ['running', 'proposed', 'paused'])
        .order('priority', { ascending: false });

    const missionSummary = missions?.length
        ? missions.map((m: Record<string, unknown>) => {
              const agentData = m.agents as { name: string } | null;
              const agent = agentData?.name ?? 'Sin asignar';
              return `• [${String(m.status).toUpperCase()}] ${m.title} — agente: ${agent}`;
          }).join('\n')
        : 'No hay misiones activas.';

    const convId = await createConversation('telegram', contactId);
    const context = `Resumen de misiones activas:\n${missionSummary}\n\nPregunta del usuario: ${userMessage}`;
    const { response } = await processMessage('CLAWDIO', convId, context, contactId);
    return response;
}

// ── Main processor ────────────────────────────────────────────────────────────

export async function processUpdate(
    update: TelegramUpdate,
    bot: BotIdentity,
    token: string
): Promise<void> {
    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat.id;
    const contactId = String(msg.from?.id ?? 'anonymous');

    // 1. Get message text (transcribe voice if needed)
    let text: string;
    try {
        if (msg.voice) {
            text = await transcribeVoice(token, msg.voice.file_id);
        } else if (msg.text) {
            text = msg.text;
        } else {
            return;
        }
    } catch (err) {
        console.error('[Processor] Failed to get message text:', err);
        await sendMessage(token, chatId, '⚠️ No pude procesar el mensaje. Intenta de nuevo.');
        return;
    }

    // 2. Route based on bot identity
    let reply: string;
    try {
        if (bot.kind === 'claude') {
            reply = await callClaude(text);

        } else if (bot.kind === 'gemini') {
            reply = await callGemini(text);

        } else {
            const agentName = bot.agentName;

            if (agentName === 'CLAWDIO') {
                reply = await clawdioReport(text, contactId);
            } else {
                const mentionedAgent = detectAgentMention(text);
                const targetAgent = mentionedAgent ?? agentName;

                const agent = await getAgentByName(targetAgent);
                const finalAgent = agent ? targetAgent : agentName;

                const convId = await createConversation('telegram', contactId);
                const result = await processMessage(finalAgent, convId, text, contactId);
                reply = result.response;
            }
        }
    } catch (err) {
        console.error('[Processor] Agent error:', err);
        reply = '⚠️ Hubo un error procesando tu mensaje. El equipo fue notificado.';
    }

    // 3. Send reply
    await sendMessage(token, chatId, reply);
}
