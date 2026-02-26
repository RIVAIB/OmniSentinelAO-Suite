import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiTools } from '../mcp/tools';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function streamGeminiResponse(
    systemPrompt: string,
    messages: any[],
    onToken: (token: string) => void,
    onToolCall?: (toolName: string, args: any, toolId?: string) => void
) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemPrompt,
        tools: [{
            functionDeclarations: getGeminiTools()
        }]
    });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
    }));
    const lastMsg = messages[messages.length - 1].content;

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMsg);

    let fullResponse = '';
    for await (const chunk of result.stream) {
        // Handle text tokens
        try {
            const chunkText = chunk.text();
            if (chunkText) {
                fullResponse += chunkText;
                onToken(chunkText);
            }
        } catch (e) {
            // Text might be empty if it's a function call chunk
        }

        // Handle function calls
        const calls = chunk.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
        if (calls && calls.length > 0 && onToolCall) {
            for (const call of calls) {
                if (call.functionCall) {
                    onToolCall(call.functionCall.name, call.functionCall.args);
                }
            }
        }
    }
    return fullResponse;
}
