import React from 'react';
import { useStore } from '../../store/useStore.js';
import { X, Download } from 'lucide-react';

export const MediaLightbox: React.FC = () => {
  const lightboxMedia = useStore((state) => state.lightboxMedia);
  const setLightboxMedia = useStore((state) => state.setLightboxMedia);

  if (!lightboxMedia) return null;

  return (
    <div
      onClick={() => setLightboxMedia(null)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
      >
        {/* Actions bar */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <a
            href={lightboxMedia.url}
            download={lightboxMedia.name || 'download'}
            className="p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition shadow-lg"
            title="Download Media"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={() => setLightboxMedia(null)}
            className="p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition shadow-lg"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media content */}
        {lightboxMedia.type === 'IMAGE' ? (
          <img
            src={lightboxMedia.url}
            alt={lightboxMedia.name || 'Image'}
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
          />
        ) : (
          <video
            src={lightboxMedia.url}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
          />
        )}
      </div>
    </div>
  );
};
