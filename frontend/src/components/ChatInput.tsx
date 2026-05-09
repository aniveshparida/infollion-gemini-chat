import React from 'react';
import type { RefObject } from 'react';
import { Paperclip, ImageIcon, StopCircle, ArrowUp, X } from 'lucide-react';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  selectedDoc: File | null;
  selectedImage: File | null;
  imagePreviewUrl: string | null;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDocSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (type: 'doc' | 'image') => void;
  handleSendMessage: (e?: React.FormEvent) => void;
  isCurrentChatLoading: boolean;
  handleStopGenerating: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  imageInputRef: RefObject<HTMLInputElement | null>;
}

export const ChatInput = ({
  inputText,
  setInputText,
  selectedDoc,
  selectedImage,
  imagePreviewUrl,
  handleImageSelect,
  handleDocSelect,
  removeAttachment,
  handleSendMessage,
  isCurrentChatLoading,
  handleStopGenerating,
  fileInputRef,
  imageInputRef
}: ChatInputProps) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-900 via-zinc-900 to-transparent pt-12 pointer-events-none">
      <div className="max-w-3xl w-full mx-auto mb-2 pointer-events-auto">
        <form onSubmit={handleSendMessage} className="bg-zinc-800 rounded-3xl p-2 flex flex-col focus-within:ring-1 focus-within:ring-zinc-600 border border-zinc-700 shadow-xl">
          
          {(selectedDoc || selectedImage) && (
            <div className="flex gap-2 mb-1 px-2 pt-2">
              {selectedDoc && (
                <div className="bg-zinc-700 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-zinc-200">
                  <Paperclip size={14} className="text-zinc-400" />
                  <span className="truncate max-w-[150px]">{selectedDoc.name}</span>
                  <button type="button" onClick={() => removeAttachment('doc')} className="hover:bg-zinc-600 p-1 rounded-full ml-1">
                    <X size={14} />
                  </button>
                </div>
              )}
              {selectedImage && imagePreviewUrl && (
                <div className="relative group">
                  <img src={imagePreviewUrl} alt="preview" className="h-12 w-12 object-cover rounded-lg border border-zinc-600" />
                  <button type="button" onClick={() => removeAttachment('image')} className="absolute -top-2 -right-2 bg-zinc-600 hover:bg-zinc-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                    <X size={12} className="text-white" />
                  </button>
                </div>
              )}
            </div>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message Gemini..."
            className="bg-transparent border-none outline-none text-zinc-100 px-3 py-3 w-full placeholder:text-zinc-400 text-[15px]"
            disabled={isCurrentChatLoading}
          />

          <div className="flex items-center justify-between mt-1 px-1">
            <div className="flex items-center gap-1">
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
      </div>
    </div>
  );
};
