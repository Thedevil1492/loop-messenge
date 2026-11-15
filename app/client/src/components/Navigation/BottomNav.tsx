import React from 'react';
import { useStore } from '../../store/useStore.js';
import type { ActiveTab } from '../../types.js';
import { MessageSquare, CircleDashed, Phone, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const activeTab = useStore((state) => state.activeTab);
  const setActiveTab = useStore((state) => state.setActiveTab);
  const chats = useStore((state) => state.chats);

  const totalUnread = chats.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'CHATS', label: 'Chats', icon: MessageSquare },
    { id: 'STATUS', label: 'Status', icon: CircleDashed },
    { id: 'CALLS', label: 'Calls', icon: Phone },
    { id: 'SETTINGS', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="w-full h-16 bg-white dark:bg-obsidian-card border-t border-slate-200 dark:border-obsidian-border flex items-center justify-around px-2 select-none z-30 transition-colors">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all relative ${
              isActive
                ? 'text-mint-600 dark:text-mint-400 font-semibold'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
            }`}
          >
            {/* Active Pill Highlight */}
            <div
              className={`relative px-4 py-1 rounded-full transition-all ${
                isActive ? 'bg-mint-500/15 dark:bg-mint-500/20' : ''
              }`}
            >
              <Icon className="w-5 h-5" />
              {/* Badge for unread chats */}
              {tab.id === 'CHATS' && totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-mint-500 text-white text-[10px] font-bold min-w-[17px] h-[17px] rounded-full flex items-center justify-center px-1 shadow-sm">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
