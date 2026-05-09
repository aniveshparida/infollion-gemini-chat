import { PDFParse } from 'pdf-parse';

export const parsePdfBuffer = async (buffer: Buffer): Promise<string> => {
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    return pdfData.text;
};

// Convert our frontend history array into the strict format Groq (OpenAI-compatible) expects
export const mapHistoryToGroqFormat = (historyStr: string) => {
    let parsedHistory: any[] = [];
    try {
        parsedHistory = JSON.parse(historyStr || '[]');
    } catch {
        // Silently fall back
    }

    return parsedHistory.map((msg: any) => {
        let text = msg.text || '';
        if (msg.role === 'user') {
            if (msg.documentName) text = `[Attached Document: ${msg.documentName}]\n${text}`;
            if (msg.imageName) text = `[Attached Image: ${msg.imageName}]\n${text}`;
        }
        return {
            role: (msg.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant' | 'system',
            content: text
        };
    });
};
