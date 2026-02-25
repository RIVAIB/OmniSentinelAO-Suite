import { AgentRole } from '../types/messages';

export function determineFirstResponder(message: string, lastResponder?: AgentRole): 'claude' | 'gemini' {
    const content = message.toLowerCase();

    // Claude-leaning topics
    const claudeTopics = ['code', 'api', 'security', 'database', 'backend', 'deployment', 'mcp', 'typescript', 'postgres'];
    if (claudeTopics.some(topic => content.includes(topic))) {
        return 'claude';
    }

    // Gemini-leaning topics
    const geminiTopics = ['ux', 'design', 'product', 'strategy', 'scaling', 'growth', 'architecture', 'user', 'business'];
    if (geminiTopics.some(topic => content.includes(topic))) {
        return 'gemini';
    }

    // Default: alternate
    return lastResponder === 'claude' ? 'gemini' : 'claude';
}

export function parseDirective(message: string): { mode: 'direct' | 'debate', targetAgent?: 'claude' | 'gemini' } {
    if (message.startsWith('@claude')) {
        return { mode: 'direct', targetAgent: 'claude' };
    }
    if (message.startsWith('@gemini')) {
        return { mode: 'direct', targetAgent: 'gemini' };
    }
    if (message.startsWith('@both') || !message.startsWith('@')) {
        return { mode: 'debate' };
    }
    return { mode: 'debate' };
}
