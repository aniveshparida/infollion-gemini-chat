import { GoogleGenerativeAI } from '@google/generative-ai';
import { parsePdfBuffer, mapHistoryToGeminiFormat } from '../utils/geminiHelper.js';


export const handleChatGeneration = async (req: any, res: any) => {
    try {
        const { message, chatId, history: historyStr } = req.body;

        if (!chatId) {
            return res.status(400).json({ error: "chatId is required" });
        }
        
        // Initialize Gemini fresh on each request to ensure latest API key from env
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash-latest",
            systemInstruction: "You are a helpful conversational AI assistant. Respond conversationally. Do not output raw JSON bounding boxes unless explicitly instructed to detect objects."
        });

        const history = mapHistoryToGeminiFormat(historyStr);

        // Multer handles the buffer; remember to check mimeType before processing.
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const document = files?.['document']?.[0];
        const image = files?.['image']?.[0];
        let promptText = message || "";
        const userParts: any[] = [];

        if (document) {
            let docText = "";
            if (document.mimetype === 'application/pdf') {
                docText = await parsePdfBuffer(document.buffer);
            } else if (document.mimetype === 'text/plain') {
                docText = document.buffer.toString('utf-8');
            }
            promptText = `[Attached Document Content]:\n${docText}\nUser Message:${promptText}`;
        }
        userParts.push({ text: promptText });

        if (image) {
            userParts.push({
                inlineData: {
                    data: image.buffer.toString("base64"),
                    mimeType: image.mimetype
                }
            });
        }
        history.push({ role: "user", parts: userParts });

        // Lock connection open for raw Server-Sent Events stream chunking.
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const result = await model.generateContentStream({ contents: history });
        
        for await (const chunk of result.stream) {
            res.write(chunk.text());
        }

        res.end();
    } catch (error: any) {
        console.error("Error processing chat:", error);
        
        // Critical failsafe: If stream already started, we must close the raw byte stream rather than throwing HTTP statuses.
        if (!res.headersSent) {
            return res.status(500).json({ error: "An error occured while processing your request", details: error?.message || String(error) });
        } else {
            res.write('\n\n**Error: Generation failed or timed out.**');
            return res.end();
        }
    }
};

export const handleChatReset = (req: any, res: any) => {
    // Backend is stateless, but frontend expects this endpoint. Kept so clicking 'Delete all' doesn't 404.
    return res.json({ success: true });
};
