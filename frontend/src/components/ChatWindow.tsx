import type { RefObject } from 'react';
import type { ChatSession } from '../types';
import { MessageBubble } from './MessageBubble';

interface ChatWindowProps {
  activeChat: ChatSession;
  isCurrentChatLoading: boolean;
  handleCopy: (id: string, text: string) => void;
  copiedId: string | null;
  resendMessage: (text: string) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  setInputText: (text: string) => void;
}

export const ChatWindow = ({
  activeChat,
  isCurrentChatLoading,
  handleCopy,
  copiedId,
  resendMessage,
  messagesEndRef,
  setInputText
}: ChatWindowProps) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-36">
      {activeChat.messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto -mt-10">
          <h2 className="text-3xl font-semibold text-zinc-100">What can I help with?</h2>
          <p className="text-zinc-400 mt-2">Ask a question, upload a document, or explore ideas.</p>
          
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
          {activeChat.messages.map((msg, index) => (
            <MessageBubble 
              key={msg.id}
              msg={msg}
              isCurrentChatLoading={isCurrentChatLoading}
              isLastMessage={index === activeChat.messages.length - 1}
              handleCopy={handleCopy}
              copiedId={copiedId}
              resendMessage={resendMessage}
            />
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      )}
    </div>
  );
};
