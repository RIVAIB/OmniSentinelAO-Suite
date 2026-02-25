import Anthropic from '@anthropic-ai/sdk';
import { ACTA_PROMPT } from '../prompts/acta';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateActa(sessionContext: string, messages: any[]): Promise<string> {
    const formattedHistory = messages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');

    const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: ACTA_PROMPT,
        messages: [
            {
                role: 'user',
                content: `Contexto del Proyecto: ${sessionContext}\n\nHistorial de la Sesión:\n\n${formattedHistory}`
            }
        ],
    });

    // Extract the text content from Claude's response
    const content = response.content[0];
    if (content.type === 'text') {
        return content.text;
    }

    throw new Error('Failed to generate acta text');
}
