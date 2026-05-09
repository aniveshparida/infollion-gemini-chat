export declare const parsePdfBuffer: (buffer: Buffer) => Promise<string>;
export declare const mapHistoryToGeminiFormat: (historyStr: string) => {
    role: string;
    parts: {
        text: any;
    }[];
}[];
//# sourceMappingURL=geminiHelper.d.ts.map