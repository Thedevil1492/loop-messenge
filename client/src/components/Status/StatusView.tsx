import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { Avatar } from '../UI/Avatar.js';
import { Plus, Camera, Sparkles, Clock, X } from 'lucide-react';

export const StatusView: React.FC = () => {
  const currentUser = useStore((state) => state.currentUser);
  const [activeStory, setActiveStory] = useState<{ name: string; avatar: string; text: string; time: string } | null>(null);

  const demoStories = [
    {
      name: 'Alice Chen',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Alice%20Chen&backgroundColor=10b981&textColor=ffffff',
      text: 'Building on Loop with high-speed encryption! 🚀',
      time: '12 minutes ago',
    },
    {
      name: 'Bob Miller',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Bob%20Miller&backgroundColor=059669&textColor=ffffff',
      text: 'Coffee and code on Sunday morning ☕💻',
      time: '45 minutes ago',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-obsidian-bg select-none overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 dark:border-obsidian-border bg-white dark:bg-obsidian-card">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Updates</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* My Status */}
        <div className="flex items-center gap-3.5 bg-white dark:bg-obsidian-card p-3 rounded-2xl border border-slate-200/80 dark:border-obsidian-border shadow-xs">
          <div className="relative cursor-pointer">
            <Avatar src={currentUser?.avatar_url} name={currentUser?.display_name || 'Me'} size="lg" />
            <button
              onClick={() => alert('Add Status: Feature active! Select photo or text status.')}
              className="absolute -bottom-1 -right-1 bg-mint-500 hover:bg-mint-600 text-white p-1 rounded-full border-2 border-white dark:border-obsidian-card transition shadow-sm"
              title="Add status update"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">My status</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Tap to add status update</p>
          </div>
          <button
            onClick={() => alert('Quick Camera: Take photo for status')}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-obsidian-surface text-zinc-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Recent Updates */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 px-1">
            Recent updates
          </h2>

          <div className="space-y-1.5">
            {demoStories.map((story) => (
              <div
                key={story.name}
                onClick={() => setActiveStory(story)}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-obsidian-card border border-slate-200/70 dark:border-obsidian-border hover:bg-slate-100 dark:hover:bg-obsidian-surface cursor-pointer transition shadow-xs"
              >
                {/* Ring Avatar */}
                <div className="p-0.5 rounded-full ring-2 ring-mint-500 ring-offset-2 ring-offset-white dark:ring-offset-obsidian-card">
                  <img src={story.avatar} alt={story.name} className="w-11 h-11 rounded-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{story.name}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{story.time}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-4 rounded-2xl bg-mint-500/10 dark:bg-mint-500/15 border border-mint-500/20 text-xs text-mint-800 dark:text-mint-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-mint-500 flex-shrink-0 mt-0.5" />
          <p>
            Status updates are end-to-end encrypted and automatically disappear after 24 hours. Only your contacts can view them.
          </p>
        </div>
      </div>

      {/* Story View Modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-6 animate-fade-in">
          {/* Progress bar */}
          <div className="w-full max-w-md h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-mint-400 w-full animate-[pulse_4s_linear]" />
          </div>

          {/* User info bar */}
          <div className="w-full max-w-md flex items-center justify-between text-white mt-4">
            <div className="flex items-center gap-3">
              <img src={activeStory.avatar} className="w-10 h-10 rounded-full" alt="" />
              <div>
                <p className="font-semibold text-sm">{activeStory.name}</p>
                <p className="text-xs text-white/60">{activeStory.time}</p>
              </div>
            </div>
            <button onClick={() => setActiveStory(null)} className="p-2 text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Story content */}
          <div className="flex-1 flex items-center justify-center max-w-md text-center p-6">
            <p className="text-2xl font-medium text-white leading-relaxed">{activeStory.text}</p>
          </div>

          <button
            onClick={() => setActiveStory(null)}
            className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition"
          >
            Close Story
          </button>
        </div>
      )}
    </div>
  );
};
