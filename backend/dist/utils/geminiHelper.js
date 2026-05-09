import { PDFParse } from 'pdf-parse';
// Extracts the raw text layer from PDF buffers.
export const parsePdfBuffer = async (buffer) => {
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    return pdfData.text;
};
// Maps our custom history array to the strict {role, parts} format Gemini expects.
// Sneaky trick: We strip out heavy base64 data from older turns, leaving only a text pointer.
export const mapHistoryToGeminiFormat = (historyStr) => {
    let parsedHistory = [];
    try {
        parsedHistory = JSON.parse(historyStr || '[]');
    }
    catch (e) {
        console.error("Failed to parse history JSON string", e);
    }
    return parsedHistory.map((msg) => {
        let text = msg.text || '';
        if (msg.role === 'user') {
            if (msg.documentName)
                text = `[Attached Document: ${msg.documentName}]\n${text}`;
            if (msg.imageName)
                text = `[Attached Image: ${msg.imageName}]\n${text}`;
        }
        return {
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text }]
        };
    });
};
//# sourceMappingURL=geminiHelper.js.map