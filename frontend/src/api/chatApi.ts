import axios from 'axios';

// Dynamically pick backend URL — local dev server vs production Render deploy
const BASE_URL = import.meta.env.DEV
    ? 'http://localhost:3001'
    : 'https://infollion-gemini-chat2.onrender.com';

export const sendMessageStream = async (
    chatId: string,
    message: string,
    history: any[],
    document: File | null | undefined,
    image: File | null | undefined,
    signal: AbortSignal | undefined,
    onChunk: (chunk: string) => void
) => {
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('message', message);
    formData.append('history', JSON.stringify(history));
    if (document) {
        formData.append('document', document);
    }
    if (image) {
        formData.append('image', image);
    }

    const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        body: formData,
        signal,
    });

    // Catch server errors (500, 502, 503) with a human-readable message
    if (response.status >= 500) {
        throw new Error('Server is currently rebooting or hit a limit. Please try again in a moment.');
    }
    if (!response.ok) {
        throw new Error('Failed to reach server');
    }
    if (!response.body) {
        throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value, { stream: true });
        if (chunkText) {
            onChunk(chunkText);
        }
    }
};

export const deleteChat = async (chatId: string) => {
    const response = await axios.post(`${BASE_URL}/api/chat/reset`, { chatId });
    return response.data;
};
