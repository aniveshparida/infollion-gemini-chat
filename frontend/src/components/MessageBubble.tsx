import { Bot, FileText, ImageIcon, Loader2, Copy, Check, RotateCcw } from 'lucide-react';
import type { Message } from '../types';
import MarkdownRenderer from './MarkdownRender';

interface MessageBubbleProps {
  msg: Message;
  isCurrentChatLoading: boolean;
  isLastMessage: boolean;
  handleCopy: (id: string, text: string) => void;
  copiedId: string | null;
  resendMessage: (text: string) => void;
}

export const MessageBubble = ({
  msg,
  isCurrentChatLoading,
  isLastMessage,
  handleCopy,
  copiedId,
  resendMessage
}: MessageBubbleProps) => {
  return (
    <div className={`flex w-full group ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-4'}`}>
      {msg.role === 'model' && (
         <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center shrink-0 bg-zinc-950 mt-1">
           <Bot size={16} className="text-zinc-100" />
         </div>
      )}

      <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end max-w-[80%]' : 'max-w-[85%]'}`}>
        {(msg.documentName || msg.imageName) && (
          <div className="flex gap-2 mb-1">
            {msg.documentName && (
              <span className="text-xs flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1.5 rounded-md text-zinc-300">
                <FileText size={12} /> {msg.documentName}
                {isCurrentChatLoading && isLastMessage && (
                   <Loader2 size={12} className="animate-spin text-zinc-400 ml-0.5" />
                )}
              </span>
            )}
            {msg.imageName && (
              <span className="text-xs flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1.5 rounded-md text-zinc-300">
                <ImageIcon size={12} /> {msg.imageName}
                {isCurrentChatLoading && isLastMessage && (
                   <Loader2 size={12} className="animate-spin text-zinc-400 ml-0.5" />
                )}
              </span>
            )}
          </div>
        )}
        
        {msg.text || (msg.role === 'model' && isCurrentChatLoading && isLastMessage) ? (
          <div className={`leading-relaxed w-full ${
            msg.role === 'user' 
              ? 'bg-zinc-800 rounded-3xl px-5 py-2.5 text-zinc-100 whitespace-pre-wrap' 
              : 'bg-transparent text-zinc-200 py-1'
          }`}>
            {msg.role === 'model' ? (
              msg.text ? <MarkdownRenderer content={msg.text} /> : <Loader2 className="animate-spin text-zinc-500 mt-1" size={16} />
            ) : (
              msg.text
            )}
          </div>
        ) : null}

        {msg.role === 'user' && (
          <div className="flex items-center gap-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
            <button onClick={() => handleCopy(msg.id, msg.text)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1" title="Copy">
              {copiedId === msg.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
            <button onClick={() => resendMessage(msg.text)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1" title="Resend">
              <RotateCcw size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
