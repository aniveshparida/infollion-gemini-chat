import axios from 'axios';

// Use local backend for development
const API_URL = 'http://localhost:3001/api';
// const API_URL = 'https://infollion-gemini-chat2.onrender.com/api';

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

    const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        body: formData,
        signal,
    });

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
    const response = await axios.post(`${API_URL}/chat/reset`, { chatId });
    return response.data;
};
