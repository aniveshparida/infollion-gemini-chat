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
  
  // Per-chat abort controllers and processing locks instead of a single global one.
  // This lets users switch chats and send messages independently.
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const processingChatsRef = useRef<Set<string>>(new Set());

  // Exposed so App.tsx can still guard "create new chat" / "delete chat" for the ACTIVE chat only.
  const isProcessing = useRef(false);

  const handleStopGenerating = () => {
    if (!activeChatId) return;
    const controller = abortControllersRef.current[activeChatId];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[activeChatId];
    }
    setLoadingStates(prev => ({ ...prev, [activeChatId]: false }));
    processingChatsRef.current.delete(activeChatId);
    isProcessing.current = processingChatsRef.current.size > 0;
  };

  const handleSendMessage = async (
    inputText: string, 
    selectedDoc: File | null, 
    selectedImage: File | null,
    overrideText?: string
  ) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    if (!textToSend.trim() && !selectedDoc && !selectedImage) return;
    if (!activeChatId) return;

    // Only block if THIS specific chat is already loading — other chats are free.
    if (loadingStates[activeChatId] || processingChatsRef.current.has(activeChatId)) return;

    const currentChatId = activeChatId;
    processingChatsRef.current.add(currentChatId);
    isProcessing.current = true;

    // Abort any stale request for THIS chat only (shouldn't happen, but safety net).
    if (abortControllersRef.current[currentChatId]) {
      abortControllersRef.current[currentChatId].abort();
    }

    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) {
      processingChatsRef.current.delete(currentChatId);
      isProcessing.current = processingChatsRef.current.size > 0;
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
    abortControllersRef.current[currentChatId] = abortController;

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
      if (abortControllersRef.current[currentChatId] === abortController) {
        delete abortControllersRef.current[currentChatId];
      }
      processingChatsRef.current.delete(currentChatId);
      isProcessing.current = processingChatsRef.current.size > 0;
    }
  };

  return { handleSendMessage, handleStopGenerating, loadingStates, isProcessing };
};
