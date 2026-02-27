import { callAgent, type ConversationMessage } from '@/lib/ai/claude';

// ─── CLAWDIO Routing Prompt ───────────────────────────────────────────────────

const ROUTING_PROMPT = `You are CLAWDIO, the routing orchestrator for RIVAIB Health Clinic.

Analyze the user's message and decide which specialist agent should handle it:

AGENTS:
- JESSY: Patient appointments, scheduling, availability, medical consultations, reminders. WhatsApp primary contact.
- NEXUS: Marketing, promotions, campaigns, lead capture, pricing questions.
- APEX: Payments, invoices, billing, financial queries, receipts.
- AXIOM: Business reports, metrics, KPIs, strategic analysis.

RULES:
- If unclear, default to JESSY (main patient contact)
- Consider conversation history for context
- Be decisive, pick ONE agent

Respond ONLY with valid JSON, nothing else:
{"agent": "AGENT_NAME", "confidence": 0.95, "reason": "brief explanation"}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoutingDecision {
    agent: string;
    confidence: number;
    reason: string;
}

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * Ask CLAWDIO (Claude) which agent should handle the message.
 * Falls back to JESSY on any parsing error.
 */
export async function routeMessage(
    message: string,
    conversationHistory?: ConversationMessage[]
): Promise<RoutingDecision> {
    try {
        const raw = await callAgent(
            {
                systemPrompt: ROUTING_PROMPT,
                model: 'claude-3-5-sonnet-20241022',
                temperature: 0.2,   // low temp → deterministic routing
                maxTokens: 256,
            },
            conversationHistory ?? [],
            message
        );

        // Strip any markdown code fences Claude might add despite instructions
        const cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned) as Partial<RoutingDecision>;

        return {
            agent: parsed.agent ?? 'JESSY',
            confidence: parsed.confidence ?? 0.5,
            reason: parsed.reason ?? 'Defaulted to JESSY',
        };
    } catch {
        // Graceful fallback — never crash the pipeline
        return { agent: 'JESSY', confidence: 0.5, reason: 'Routing fallback (parse error)' };
    }
}
