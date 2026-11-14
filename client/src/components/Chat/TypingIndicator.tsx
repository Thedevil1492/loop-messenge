import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-200/80 dark:bg-slate-800 text-slate-500 max-w-[80px] shadow-sm animate-fade-in">
      <span className="w-2 h-2 rounded-full bg-loop-500 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-cyanAccent-500 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-loop-400 animate-bounce" />
    </div>
  );
};
