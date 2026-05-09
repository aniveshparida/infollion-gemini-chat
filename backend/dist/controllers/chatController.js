import { GoogleGenerativeAI } from '@google/generative-ai';
import { parsePdfBuffer, mapHistoryToGeminiFormat } from '../utils/geminiHelper.js';
export const handleChatGeneration = async (req, res) => {
    try {
        const { message, chatId, history: historyStr } = req.body;
        if (!chatId) {
            return res.status(400).json({ error: "chatId is required" });
        }
        // Fresh client per request — guarantees env key is always current after a redeploy
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: "You are a helpful conversational AI assistant. Respond conversationally. Do not output raw JSON bounding boxes unless explicitly instructed to detect objects."
        });
        const history = mapHistoryToGeminiFormat(historyStr);
        // Multer already parsed the multipart payload into buffers for us
        const files = req.files;
        const document = files?.['document']?.[0];
        const image = files?.['image']?.[0];
        let promptText = message || "";
        const userParts = [];
        if (document) {
            let docText = "";
            if (document.mimetype === 'application/pdf') {
                docText = await parsePdfBuffer(document.buffer);
            }
            else if (document.mimetype === 'text/plain') {
                docText = document.buffer.toString('utf-8');
            }
            promptText = `[Attached Document Content]:\n${docText}\nUser Message:${promptText}`;
        }
        userParts.push({ text: promptText });
        // Image inline data — mimeType must be camelCase for the Gemini SDK
        if (image) {
            userParts.push({
                inlineData: {
                    data: image.buffer.toString("base64"),
                    mimeType: image.mimetype
                }
            });
        }
        history.push({ role: "user", parts: userParts });
        // Open a streaming connection so the frontend can read chunks in real-time
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const result = await model.generateContentStream({ contents: history });
        for await (const chunk of result.stream) {
            res.write(chunk.text());
        }
        res.end();
    }
    catch (error) {
        // Detect 429 rate-limit errors from Gemini and send a friendly message instead of crashing
        const is429 = error?.status === 429 || error?.message?.includes('429');
        if (is429) {
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
            }
            res.write('⚠️ Rate Limit Reached: The Gemini Free Tier is busy. Please wait 60 seconds before sending another message.');
            return res.end();
        }
        // Any other error — log it and respond without crashing the process
        console.error("Chat generation error:", error?.message || error);
        if (!res.headersSent) {
            return res.status(500).json({
                error: "Generation failed",
                details: error?.message || String(error)
            });
        }
        else {
            res.write('\n\n**Error: Generation failed or timed out.**');
            return res.end();
        }
    }
};
export const handleChatReset = (_req, res) => {
    // Stateless backend — this endpoint exists so the frontend "delete chat" action doesn't 404
    return res.json({ success: true });
};
//# sourceMappingURL=chatController.js.map