import Groq from 'groq-sdk';
import { parsePdfBuffer, mapHistoryToGroqFormat } from '../utils/aiHelper.js';

export const handleChatGeneration = async (req: any, res: any) => {
    try {
        const { message, chatId, history: historyStr } = req.body;

        if (!chatId) {
            return res.status(400).json({ error: "chatId is required" });
        }

        // Initialize Groq fresh on each request
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

        const history = mapHistoryToGroqFormat(historyStr);

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const document = files?.['document']?.[0];
        const image = files?.['image']?.[0];
        let promptText = message || "";

        if (document) {
            let docText = "";
            if (document.mimetype === 'application/pdf') {
                docText = await parsePdfBuffer(document.buffer);
            } else if (document.mimetype === 'text/plain') {
                docText = document.buffer.toString('utf-8');
            }
            promptText = `[Attached Document Content]:\n${docText}\nUser Message:${promptText}`;
        }

        if (image) {
            promptText = `[User attached an image but vision is not fully supported on this model. Please inform the user gracefully.]\nUser Message:${promptText}`;
        }

        history.push({ role: "user", content: promptText } as any);

        // Add system prompt
        history.unshift({ 
            role: "system", 
            content: "You are a helpful conversational AI assistant. Respond conversationally. Do not output raw JSON bounding boxes unless explicitly instructed to detect objects." 
        } as any);

        // Open a streaming connection so the frontend can read chunks in real-time
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await groq.chat.completions.create({
            messages: history as any,
            model: "llama-3.3-70b-versatile",
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(content);
            }
        }

        res.end();
    } catch (error: any) {
        const is429 = error?.status === 429 || error?.message?.includes('429');

        if (is429) {
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
            }
            res.write('⚠️ Rate Limit Reached: The Groq Free Tier is busy. Please wait a moment before sending another message.');
            return res.end();
        }

        console.error("Chat generation error:", error?.message || error);

        if (!res.headersSent) {
            return res.status(500).json({
                error: "Generation failed",
                details: error?.message || String(error)
            });
        } else {
            res.write('\n\n**Error: Generation failed or timed out.**');
            return res.end();
        }
    }
};

export const handleChatReset = (_req: any, res: any) => {
    return res.json({ success: true });
};
