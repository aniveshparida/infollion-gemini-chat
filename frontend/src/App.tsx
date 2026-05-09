import React, { useState, useEffect, useRef } from 'react';
import { Menu, SquarePen } from 'lucide-react';
import type { ChatSession, Message } from './types';
import { useChatStream } from './hooks/useChatStream';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';

function App() {
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chats');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    return localStorage.getItem('activeChatId');
  });
  
  const [inputText, setInputText] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem('activeChatId', activeChatId);
    } else {
      localStorage.removeItem('activeChatId');
    }
  }, [activeChatId]);

  useEffect(() => {
    if (!initialized.current && chats.length === 0) {
      const newId = crypto.randomUUID();
      const initialChat: ChatSession = {
        id: newId,
        title: 'New Chat',
        messages: []
      };
      setChats([initialChat]);
      setActiveChatId(newId);
      initialized.current = true;
    }
  }, [chats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeChatId]);

  useEffect(() => {
    return () => {
      // Memory cleanup: Prevent memory leaks from lingering object URLs.
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const updateChatMessages = (chatId: string, message: Message | ((prev: Message[]) => Message[]), newTitle?: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const updatedMessages = typeof message === 'function' ? message(chat.messages) : [...chat.messages, message];
        return {
          ...chat,
          messages: updatedMessages,
          title: newTitle || chat.title
        };
      }
      return chat;
    }));
  };

  const appendChunkToMessage = (chatId: string, messageId: string, chunk: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;
      const msgs = chat.messages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, text: msg.text + chunk };
        }
        return msg;
      });
      return { ...chat, messages: msgs };
    }));
  };

  const clearInputs = () => {
    setInputText('');
    setSelectedDoc(null);
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // The custom hook handles the heavy lifting for the API connection and locking.
  const { handleSendMessage, handleStopGenerating, loadingStates, isProcessing } = useChatStream(
    chats,
    activeChatId,
    updateChatMessages,
    appendChunkToMessage,
    clearInputs
  );

  const activeChat = chats.find(c => c.id === activeChatId);
  const isCurrentChatLoading = activeChatId ? loadingStates[activeChatId] || false : false;

  const createNewChat = () => {
    if (isProcessing.current) return;
    const newId = crypto.randomUUID();
    const newChat: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newId);
    setSidebarOpen(false);
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isProcessing.current && activeChatId === id) return;
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      const remaining = chats.filter(c => c.id !== id);
      setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedDoc(e.target.files[0]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeAttachment = (type: 'doc' | 'image') => {
    if (type === 'doc') {
      setSelectedDoc(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setSelectedImage(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resendMessage = (text: string) => {
    handleSendMessage(text, null, null, text);
  };

  return (
    <div className="flex h-screen bg-[#000000] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-700">
      <Sidebar 
        chats={chats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        createNewChat={createNewChat}
        handleDeleteChat={handleDeleteChat}
        loadingStates={loadingStates}
      />

      <div className="flex-1 flex flex-col bg-zinc-900 relative h-screen overflow-hidden">
        
        {/* Mobile Header */}
        <header className="h-14 flex items-center px-4 justify-between shrink-0 z-10 relative md:hidden">
          <div className="flex items-center gap-2">
             <button onClick={() => setSidebarOpen(true)} className="text-zinc-300 hover:bg-zinc-800 p-2 rounded-md">
               <Menu size={18} />
             </button>
             <button onClick={createNewChat} className="text-zinc-300 hover:bg-zinc-800 p-2 rounded-md">
               <SquarePen size={18} />
             </button>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 md:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="w-64 h-full" onClick={e => e.stopPropagation()}>
               <Sidebar 
                  chats={chats}
                  activeChatId={activeChatId}
                  setActiveChatId={(id) => { setActiveChatId(id); setSidebarOpen(false); }}
                  createNewChat={createNewChat}
                  handleDeleteChat={handleDeleteChat}
                  loadingStates={loadingStates}
                />
            </div>
          </div>
        )}

        {/* Chat Window handles the entire feed of messages */}
        {activeChat && (
          <ChatWindow 
            activeChat={activeChat}
            isCurrentChatLoading={isCurrentChatLoading}
            handleCopy={handleCopy}
            copiedId={copiedId}
            resendMessage={resendMessage}
            messagesEndRef={messagesEndRef}
            setInputText={setInputText}
          />
        )}

        {/* Chat Input form handles attachments and the text area */}
        <ChatInput 
          inputText={inputText}
          setInputText={setInputText}
          selectedDoc={selectedDoc}
          selectedImage={selectedImage}
          imagePreviewUrl={imagePreviewUrl}
          handleImageSelect={handleImageSelect}
          handleDocSelect={handleDocSelect}
          removeAttachment={removeAttachment}
          handleSendMessage={(e) => {
            if (e) e.preventDefault();
            handleSendMessage(inputText, selectedDoc, selectedImage, undefined);
          }}
          isCurrentChatLoading={isCurrentChatLoading}
          handleStopGenerating={handleStopGenerating}
          fileInputRef={fileInputRef}
          imageInputRef={imageInputRef}
        />
      </div>
    </div>
  );
}

export default App;