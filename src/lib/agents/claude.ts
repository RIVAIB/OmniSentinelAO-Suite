import Anthropic from '@anthropic-ai/sdk';
import { MCP_TOOLS } from '../mcp/tools';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function streamClaudeResponse(
    systemPrompt: string,
    messages: any[],
    onToken: (token: string) => void,
    onToolCall?: (toolName: string, args: any, id: string) => void
) {
    const stream = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
        tools: MCP_TOOLS.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema
        })),
        stream: true,
    });

    let fullResponse = '';
    let currentTool: { name: string, id: string, input: string } | null = null;

    for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
            const text = chunk.delta.text;
            fullResponse += text;
            onToken(text);
        }

        if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
            currentTool = {
                name: chunk.content_block.name,
                id: chunk.content_block.id,
                input: ''
            };
        }

        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'input_json_delta') {
            if (currentTool) {
                currentTool.input += chunk.delta.partial_json;
            }
        }

        if (chunk.type === 'content_block_stop' && currentTool) {
            if (onToolCall) {
                try {
                    const args = JSON.parse(currentTool.input);
                    onToolCall(currentTool.name, args, currentTool.id);
                } catch (e) {
                    console.error('Failed to parse tool input:', currentTool.input);
                }
            }
            currentTool = null;
        }
    }
    return fullResponse;
}
