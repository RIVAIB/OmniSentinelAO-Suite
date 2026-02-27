import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AgentCallConfig {
    systemPrompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Send a message to Claude, prepending conversationHistory as context.
 * Returns the assistant's plain-text reply, or '' if the response isn't text.
 */
export async function callAgent(
    config: AgentCallConfig,
    conversationHistory: ConversationMessage[],
    userMessage: string
): Promise<string> {
    const response = await anthropic.messages.create({
        model: config.model ?? 'claude-sonnet-4-6',
        max_tokens: config.maxTokens ?? 1024,
        temperature: config.temperature ?? 0.7,
        system: config.systemPrompt,
        messages: [
            ...conversationHistory,
            { role: 'user', content: userMessage },
        ],
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
}
