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

  // Per-chat abort controllers so switching chats doesn't kill an in-flight stream
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  // Per-chat processing lock — prevents double-clicks from burning API quota
  const processingChatsRef = useRef<Set<string>>(new Set());

  const handleStopGenerating = () => {
    if (!activeChatId) return;
    const controller = abortControllersRef.current[activeChatId];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[activeChatId];
    }
    setLoadingStates(prev => ({ ...prev, [activeChatId]: false }));
    processingChatsRef.current.delete(activeChatId);
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

    // Only block if THIS chat is already mid-stream — other chats stay independent
    if (loadingStates[activeChatId] || processingChatsRef.current.has(activeChatId)) return;

    const currentChatId = activeChatId;
    processingChatsRef.current.add(currentChatId);

    // Kill any lingering request for this specific chat (shouldn't happen, but safety net)
    if (abortControllersRef.current[currentChatId]) {
      abortControllersRef.current[currentChatId].abort();
    }

    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) {
      processingChatsRef.current.delete(currentChatId);
      return;
    }

    // Auto-generate a title from the first message so the sidebar isn't full of "New Chat"
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

    // Snapshot inputs before clearing them — the async call needs the original values
    const messageToSend = textToSend;
    const docToSend = selectedDoc;
    const imgToSend = selectedImage;
    const historyToSend = currentChat.messages.slice(-10);

    clearInputs();
    setLoadingStates(prev => ({ ...prev, [currentChatId]: true }));

    const abortController = new AbortController();
    abortControllersRef.current[currentChatId] = abortController;

    // Create an empty bot message that we'll fill with streamed chunks
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
      const isAbort = error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
      if (!isAbort) {
        appendChunkToMessage(currentChatId, botMessageId, '\n\n**Error: Could not reach the server or generation failed.**');
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [currentChatId]: false }));
      if (abortControllersRef.current[currentChatId] === abortController) {
        delete abortControllersRef.current[currentChatId];
      }
      processingChatsRef.current.delete(currentChatId);
    }
  };

  return { handleSendMessage, handleStopGenerating, loadingStates };
};
