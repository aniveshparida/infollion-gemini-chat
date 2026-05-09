import { PDFParse } from 'pdf-parse';
// Pull raw text from a PDF buffer so we can feed it to Gemini as context
export const parsePdfBuffer = async (buffer) => {
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    return pdfData.text;
};
// Convert our frontend history array into the strict {role, parts} format Gemini expects.
// We strip heavy base64 data from older turns and leave only a text reference to save tokens.
export const mapHistoryToGeminiFormat = (historyStr) => {
    let parsedHistory = [];
    try {
        parsedHistory = JSON.parse(historyStr || '[]');
    }
    catch {
        // Silently fall back to empty history if the JSON is malformed
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