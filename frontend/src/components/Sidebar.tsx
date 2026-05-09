import { Plus, Trash2, User, ChevronDown, Loader2 } from 'lucide-react';
import type { ChatSession } from '../types';

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  setActiveChatId: (id: string) => void;
  createNewChat: () => void;
  handleDeleteChat: (e: React.MouseEvent, id: string) => void;
  loadingStates: Record<string, boolean>;
}

export const Sidebar = ({
  chats,
  activeChatId,
  setActiveChatId,
  createNewChat,
  handleDeleteChat,
  loadingStates
}: SidebarProps) => {
  return (
    <div className="w-64 bg-[#1e1e1e] border-r border-zinc-800 flex-col hidden md:flex shrink-0 h-screen">
      <div className="p-4 flex flex-col gap-2">
        <button 
          onClick={createNewChat}
          className="flex items-center gap-2 text-zinc-100 bg-transparent hover:bg-zinc-800 transition rounded-md px-3 py-2 text-sm w-full font-medium"
        >
          <Plus size={18} />
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-semibold text-zinc-500 mb-2 px-2 mt-4">HISTORY</div>
        {chats.length === 0 ? (
          <div className="text-zinc-500 text-sm px-2">No history</div>
        ) : (
          <div className="flex flex-col gap-1">
            {chats.map(chat => (
              <div 
                key={chat.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition text-sm ${
                  activeChatId === chat.id 
                    ? 'bg-zinc-800 text-zinc-100' 
                    : 'text-zinc-300 hover:bg-[#2a2a2a]'
                }`}
                onClick={() => setActiveChatId(chat.id)}
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
  );
};
