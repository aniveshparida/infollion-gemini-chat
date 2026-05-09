import { useState, useRef } from 'react';
import { sendMessageStream } from '../api/chatApi';
import type { ChatSession, Message } from '../types';

export const useChatStream = (
  chats: ChatSession[],
  activeChatId: string | null,
  updateChatMessages: (chatId: string, message: Message, newTitle?: string) => void,
  appendChunkToMessage: (chatId: string, messageId: string, chunk: string) => void,
  clearInputs: () => void
) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const isProcessing = useRef(false);
  const globalAbortControllerRef = useRef<AbortController | null>(null);

  const handleStopGenerating = () => {
    if (globalAbortControllerRef.current) {
      globalAbortControllerRef.current.abort();
      globalAbortControllerRef.current = null;
    }
    if (activeChatId) {
      setLoadingStates(prev => ({ ...prev, [activeChatId]: false }));
    }
    isProcessing.current = false;
  };

  const handleSendMessage = async (
    inputText: string, 
    selectedDoc: File | null, 
    selectedImage: File | null,
    overrideText?: string
  ) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    if (!textToSend.trim() && !selectedDoc && !selectedImage) return;
    if (!activeChatId || loadingStates[activeChatId]) return;

    // Impenetrable lock: useRef is synchronous, completely shutting down double-click loops.
    if (isProcessing.current) return;
    isProcessing.current = true;

    // Immediately cancel any previous ongoing request at the browser level
    if (globalAbortControllerRef.current) {
      globalAbortControllerRef.current.abort();
    }

    const currentChatId = activeChatId;
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) {
      isProcessing.current = false;
      return;
    }

    const isFirstMessage = currentChat.messages.length === 0;
    const generatedTitle = isFirstMessage && textToSend.trim()
      ? textToSend.trim().split(' ').slice(0, 4).join(' ') + (textToSend.trim().split(' ').length > 4 ? '...' : '')
      : currentChat.title;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: textToSend,
      documentName: selectedDoc?.name,
      imageName: selectedImage?.name,
    };

    updateChatMessages(currentChatId, userMessage, generatedTitle);
    
    const messageToSend = textToSend;
    const docToSend = selectedDoc;
    const imgToSend = selectedImage;
    const historyToSend = currentChat.messages.slice(-10); // Truncate history for token efficiency
    
    clearInputs();
    setLoadingStates(prev => ({ ...prev, [currentChatId]: true }));

    const abortController = new AbortController();
    globalAbortControllerRef.current = abortController;

    const botMessageId = crypto.randomUUID();
    const initialBotMessage: Message = {
      id: botMessageId,
      role: 'model',
      text: '',
    };
    updateChatMessages(currentChatId, initialBotMessage);

    try {
      await sendMessageStream(
        currentChatId,
        messageToSend,
        historyToSend,
        docToSend,
        imgToSend,
        abortController.signal,
        (chunkText) => {
          appendChunkToMessage(currentChatId, botMessageId, chunkText);
        }
      );
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        console.log(`Request aborted for chat ${currentChatId}`);
      } else {
        console.error('Failed to send message:', error);
        appendChunkToMessage(currentChatId, botMessageId, '\n\n**Error: Could not reach the server or generation failed.**');
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [currentChatId]: false }));
      if (globalAbortControllerRef.current === abortController) {
        globalAbortControllerRef.current = null;
      }
      isProcessing.current = false;
    }
  };

  return { handleSendMessage, handleStopGenerating, loadingStates, isProcessing };
};
