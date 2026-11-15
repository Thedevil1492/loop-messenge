import React from 'react';

interface DeliveryTicksProps {
  status?: 'SENT' | 'DELIVERED' | 'READ';
  className?: string;
}

export const DeliveryTicks: React.FC<DeliveryTicksProps> = ({ status = 'SENT', className = '' }) => {
  if (status === 'SENT') {
    // Single checkmark (grey)
    return (
      <svg
        className={`w-3.5 h-3.5 inline text-slate-400 dark:text-slate-400 ${className}`}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 8.5l3 3 6-6" />
      </svg>
    );
  }

  if (status === 'DELIVERED') {
    // Double checkmark (grey)
    return (
      <svg
        className={`w-4 h-4 inline text-slate-400 dark:text-slate-400 ${className}`}
        viewBox="0 0 20 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 8.5l3 3 6-6" />
        <path d="M7.5 8.5l3 3 6-6" />
      </svg>
    );
  }

  // Double checkmark (cyan/blue for READ)
  return (
    <svg
      className={`w-4 h-4 inline text-cyan-400 dark:text-cyan-300 drop-shadow-sm ${className}`}
      viewBox="0 0 20 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8.5l3 3 6-6" />
      <path d="M7.5 8.5l3 3 6-6" />
    </svg>
  );
};
