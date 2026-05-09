import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  FileText, Loader2, User, Bot, X, Trash2, StopCircle,
  SquarePen, ChevronDown, Paperclip, ArrowUp
} from 'lucide-react';
import { type ChatSession, type Message } from './types';
import { sendMessage, deleteChat } from './chatApi';
import MarkdownRenderer from './components/MarkdownRender';

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
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const isCurrentChatLoading = activeChatId ? loadingStates[activeChatId] : false;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const abortControllersRef = useRef<Record<string, AbortController>>({});

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
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedImage]);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  useEffect(() => {
    if (!initialized.current && chats.length === 0) {
      initialized.current = true;
      createNewChat();
    }
  }, []);

  const createNewChat = () => {
    const newChatId = crypto.randomUUID();
    const newChat: ChatSession = {
      id: newChatId,
      title: `Chat ${chats.length + 1}`,
      messages: [],
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    clearInputs();
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      // Backend does not need to store chats permanently, but we still trigger reset just in case
      await deleteChat(chatId);
    } catch (err) {
      console.error("Failed to call delete chat", err);
    }
    
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length <= 1) createNewChat();
    }
  };

  const handleClearCurrentChat = async () => {
    if (!activeChatId) return;
    try {
      await deleteChat(activeChatId);
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [] } : c));
    } catch (err) {
      console.error("Failed to clear chat", err);
    }
  };

  const handleStopGenerating = () => {
    if (activeChatId && abortControllersRef.current[activeChatId]) {
      abortControllersRef.current[activeChatId].abort();
      setLoadingStates(prev => ({ ...prev, [activeChatId]: false }));
      delete abortControllersRef.current[activeChatId];
    }
  };

  const clearInputs = () => {
    setInputText('');
    setSelectedDoc(null);
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedDoc(file);
  };

  const removeAttachment = (type: 'doc' | 'image') => {
    if (type === 'doc') {
      setSelectedDoc(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setSelectedImage(null);
      setImagePreviewUrl(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedDoc && !selectedImage) return;
    if (!activeChatId) return;

    const currentChatId = activeChatId; // Capture for the closure
    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) return;

    const isFirstMessage = currentChat.messages.length === 0;
    const generatedTitle = isFirstMessage && inputText.trim()
      ? inputText.trim().split(' ').slice(0, 4).join(' ') + (inputText.trim().split(' ').length > 4 ? '...' : '')
      : currentChat.title;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: inputText,
      documentName: selectedDoc?.name,
      imageName: selectedImage?.name,
    };

    updateChatMessages(currentChatId, userMessage, generatedTitle);
    
    const messageToSend = inputText;
    const docToSend = selectedDoc;
    const imgToSend = selectedImage;
    const historyToSend = currentChat.messages; // pass existing messages
    
    clearInputs();
    setLoadingStates(prev => ({ ...prev, [currentChatId]: true }));

    const abortController = new AbortController();
    abortControllersRef.current[currentChatId] = abortController;

    try {
      const data = await sendMessage(currentChatId, messageToSend, historyToSend, docToSend, imgToSend, abortController.signal);
      const botMessage: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        text: data.response,
      };
      updateChatMessages(currentChatId, botMessage);
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        console.log(`Request aborted for chat ${currentChatId}`);
      } else {
        console.error('Failed to send message:', error);
        updateChatMessages(currentChatId, {
          id: crypto.randomUUID(),
          role: 'model',
          text: 'Error: Could not reach the server.',
        });
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [currentChatId]: false }));
      delete abortControllersRef.current[currentChatId];
    }
  };

  const updateChatMessages = (chatId: string, newMessage: Message, newTitle?: string) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId 
          ? { ...chat, messages: [...chat.messages, newMessage], title: newTitle || chat.title } 
          : chat
      )
    );
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex h-screen font-sans text-zinc-100 bg-zinc-950 overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-64 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 flex flex-col gap-2">
          <button 
            onClick={createNewChat}
            className="hover:bg-zinc-800 rounded-md px-3 py-2 text-sm flex items-center justify-between text-zinc-100 transition"
          >
            <div className="flex items-center gap-2">
              <SquarePen size={16} />
              <span>New chat</span>
            </div>
          </button>
          
          <button 
            onClick={() => { setChats([]); setActiveChatId(null); }}
            className="hover:bg-zinc-800 rounded-md px-3 py-2 text-sm flex items-center gap-2 text-zinc-400 hover:text-red-400 transition"
          >
            <Trash2 size={16} />
            <span>Delete all</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4">
          <div className="text-[11px] font-semibold text-zinc-500 tracking-wider uppercase mb-3 mt-6">
            History
          </div>
          {chats.length === 0 ? (
            <div className="text-sm text-zinc-500">
              Your conversations will appear here once you start chatting!
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-md transition cursor-pointer group text-sm ${
                    activeChatId === chat.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate overflow-hidden flex-1">
                    <span className="truncate">{chat.title}</span>
                    {loadingStates[chat.id] && (
                      <Loader2 size={12} className="animate-spin text-zinc-400 shrink-0" />
                    )}
                  </div>
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition ml-2 shrink-0"
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Footer */}
        <div className="p-4 border-t border-zinc-800">
          <button className="w-full flex items-center justify-between hover:bg-zinc-800 rounded-md px-3 py-2 transition text-sm">
             <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                  <User size={14} className="text-zinc-300" />
               </div>
               <span className="font-medium text-zinc-200">Guest</span>
             </div>
             <ChevronDown size={14} className="text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-zinc-900 relative h-screen overflow-hidden">
        
        {/* Header (Minimal) */}
        <header className="h-14 flex items-center px-4 justify-between shrink-0 z-10 relative">
          <div className="md:hidden flex items-center gap-2">
             <button onClick={createNewChat} className="text-zinc-300 hover:bg-zinc-800 p-2 rounded-md">
               <SquarePen size={18} />
             </button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
             {activeChat?.messages.length ? (
               <button onClick={handleClearCurrentChat} className="text-zinc-400 hover:text-red-400 p-2 rounded-md transition" title="Clear Chat">
                  <Trash2 size={18} />
               </button>
             ) : null}

          </div>
        </header>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto px-4 pb-36">
          {activeChat?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto -mt-10">
              <h2 className="text-3xl font-semibold text-zinc-100">What can I help with?</h2>
              <p className="text-zinc-400 mt-2">Ask a question, upload a document, or explore ideas.</p>
              
              {/* Suggestion Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-2xl">
                 <div className="border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400 hover:bg-zinc-800 transition cursor-pointer text-left" onClick={() => setInputText("Help me write an essay")}>
                    Help me write an essay
                 </div>
                 <div className="border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400 hover:bg-zinc-800 transition cursor-pointer text-left" onClick={() => setInputText("Summarize this document")}>
                    Summarize this document
                 </div>
                 <div className="border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400 hover:bg-zinc-800 transition cursor-pointer text-left" onClick={() => setInputText("Explain quantum computing")}>
                    Explain quantum computing
                 </div>
                 <div className="border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400 hover:bg-zinc-800 transition cursor-pointer text-left" onClick={() => setInputText("What are some good meal prep ideas?")}>
                    What are some good meal prep ideas?
                 </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pt-8">
              {activeChat?.messages.map((msg, index) => (
                <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-4'}`}>
                  
                  {msg.role === 'model' && (
                     <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center shrink-0 bg-zinc-950 mt-1">
                       <Bot size={16} className="text-zinc-100" />
                     </div>
                  )}

                  <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end max-w-[80%]' : 'max-w-[85%]'}`}>
                    
                    {/* Render Attachment Indicators */}
                    {(msg.documentName || msg.imageName) && (
                      <div className="flex gap-2 mb-1">
                        {msg.documentName && (
                          <span className="text-xs flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1.5 rounded-md text-zinc-300">
                            <FileText size={12} /> {msg.documentName}
                            {isCurrentChatLoading && index === activeChat.messages.length - 1 && (
                               <Loader2 size={12} className="animate-spin text-zinc-400 ml-0.5" />
                            )}
                          </span>
                        )}
                        {msg.imageName && (
                          <span className="text-xs flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1.5 rounded-md text-zinc-300">
                            <ImageIcon size={12} /> {msg.imageName}
                            {isCurrentChatLoading && index === activeChat.messages.length - 1 && (
                               <Loader2 size={12} className="animate-spin text-zinc-400 ml-0.5" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    {msg.text && (
                      <div className={`leading-relaxed w-full ${
                        msg.role === 'user' 
                          ? 'bg-zinc-800 rounded-3xl px-5 py-2.5 text-zinc-100 whitespace-pre-wrap' 
                          : 'bg-transparent text-zinc-200 py-1 overflow-x-auto'
                      }`}>
                        {msg.role === 'model' ? (
                          <MarkdownRenderer content={msg.text} />
                        ) : (
                          msg.text
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isCurrentChatLoading && (
                <div className="flex w-full justify-start gap-4">
                  <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center shrink-0 bg-zinc-950 mt-1">
                    <Bot size={16} className="text-zinc-100" />
                  </div>
                  <div className="text-zinc-400 py-2 flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area (Floating center) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-900 via-zinc-900 to-transparent pt-12 pointer-events-none">
          <div className="max-w-3xl w-full mx-auto mb-2 pointer-events-auto">
            <form onSubmit={handleSendMessage} className="bg-zinc-800 rounded-3xl p-2 flex flex-col focus-within:ring-1 focus-within:ring-zinc-600 border border-zinc-700 shadow-xl">
              
              {/* Top Row: Previews */}
              {(selectedDoc || selectedImage) && (
                <div className="flex gap-2 mb-1 px-2 pt-2">
                  {selectedDoc && (
                    <div className="flex items-center gap-2 bg-zinc-700 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-200">
                      <FileText size={14} className="text-zinc-400" />
                      <span className="truncate max-w-[120px]">{selectedDoc.name}</span>
                      <button type="button" onClick={() => removeAttachment('doc')} className="text-zinc-400 hover:text-zinc-100 ml-1">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {selectedImage && imagePreviewUrl && (
                    <div className="relative group">
                      <img src={imagePreviewUrl} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-zinc-600" />
                      <button type="button" onClick={() => removeAttachment('image')} className="absolute -top-2 -right-2 bg-zinc-600 hover:bg-zinc-500 text-zinc-100 rounded-full p-1 shadow-sm transition opacity-0 group-hover:opacity-100">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Middle Row: Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message Gemini..."
                className="bg-transparent border-none outline-none text-zinc-100 px-3 py-3 w-full placeholder:text-zinc-400 text-[15px]"
                disabled={isCurrentChatLoading}
              />

              {/* Bottom Row: Controls */}
              <div className="flex items-center justify-between mt-1 px-1">
                <div className="flex items-center gap-1">
                  {/* Hidden File Inputs */}
                  <input type="file" accept=".txt,.pdf" ref={fileInputRef} onChange={handleDocSelect} className="hidden" />
                  <input type="file" accept=".png,.jpg,.jpeg" ref={imageInputRef} onChange={handleImageSelect} className="hidden" />

                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="text-zinc-400 hover:text-zinc-200 p-2 rounded-xl hover:bg-zinc-700 transition"
                    title="Attach Document"
                  >
                    <Paperclip size={20} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => imageInputRef.current?.click()} 
                    className="text-zinc-400 hover:text-zinc-200 p-2 rounded-xl hover:bg-zinc-700 transition"
                    title="Attach Image"
                  >
                    <ImageIcon size={20} />
                  </button>
                </div>

                {isCurrentChatLoading ? (
                  <button 
                    type="button" 
                    onClick={handleStopGenerating}
                    className="bg-zinc-100 text-zinc-900 rounded-full p-2 hover:bg-zinc-300 transition shrink-0"
                    title="Stop Generating"
                  >
                    <StopCircle size={18} />
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={!inputText.trim() && !selectedDoc && !selectedImage}
                    className="bg-zinc-100 text-zinc-900 rounded-full p-2 hover:bg-zinc-300 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <ArrowUp size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </form>
            <div className="text-center mt-3 text-[11px] text-zinc-500">
              Gemini can make mistakes. Check important info.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;