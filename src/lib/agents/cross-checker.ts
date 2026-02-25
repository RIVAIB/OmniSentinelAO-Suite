export function buildCrossCheckContext(
    previousAgentResponse: string,
    previousAgentName: 'claude' | 'gemini'
): string {
    return `
## ⚠️ CROSS-CHECK REQUIRED
The following response was just given by ${previousAgentName === 'claude' ? 'Claude (Engineer)' : 'Gemini (Strategist)'}:

---
${previousAgentResponse}
---

Before giving your own response, you MUST:
1. Analyze the above for any contradictions with what has been previously agreed in this session
2. Start your response with one of:
   - "✅ VALIDATED — [brief reason]" if you agree
   - "⚠️ CONTRADICTION — [specific issue]" followed by "PROPOSED RESOLUTION: [your fix]"
3. Then provide your own contribution

Do NOT skip this step. Richard relies on cross-validation to make decisions.
`;
}

export function parseCrossCheckStatus(response: string): {
    status: 'validated' | 'contradiction_found' | 'resolved';
    detail: string;
} {
    if (response.includes('✅ VALIDATED')) {
        const detail = response.match(/✅ VALIDATED\s*—?\s*(.*?)(?:\n|$)/)?.[1] || '';
        return { status: 'validated', detail };
    }
    if (response.includes('⚠️ CONTRADICTION')) {
        const detail = response.match(/⚠️ CONTRADICTION\s*—?\s*([\s\S]*?)(?:\n|PROPOSED)/)?.[1] || '';
        return { status: 'contradiction_found', detail: detail.trim() };
    }
    return { status: 'validated', detail: 'Implicit agreement' };
}
