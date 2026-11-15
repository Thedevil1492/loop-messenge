import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore.js';
import { api } from '../../services/api.js';
import { Avatar } from '../UI/Avatar.js';
import { Plus, Camera, Sparkles, Clock, X, Image as ImageIcon, Send, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StatusItem {
  id: string;
  user_id: string;
  text: string;
  media_url?: string | null;
  bg_color: string;
  created_at: number;
  display_name: string;
  avatar_url: string;
  username?: string | null;
}

export const StatusView: React.FC = () => {
  const currentUser = useStore((state) => state.currentUser);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Add Status Modal
  const [isAdding, setIsAdding] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Story Viewer Modal
  const [viewingStatus, setViewingStatus] = useState<StatusItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorPalette = ['#10b981', '#065f46', '#18181b', '#6366f1', '#8b5cf6', '#ec4899', '#f97316'];

  const loadStatuses = async () => {
    setLoading(true);
    try {
      const list = await api.getStatusUpdates();
      setStatuses(list);
    } catch (err) {
      console.error('Failed to load status updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const media = await api.uploadFile(file);
      setUploadedMediaUrl(media.url);
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePostStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusText.trim() && !uploadedMediaUrl) return;

    setSubmitting(true);
    try {
      await api.createStatusUpdate(statusText.trim(), uploadedMediaUrl || undefined, selectedColor);
      setStatusText('');
      setUploadedMediaUrl(null);
      setIsAdding(false);
      await loadStatuses();
    } catch (err: any) {
      alert(err.message || 'Failed to post status');
    } finally {
      setSubmitting(false);
    }
  };

  // Separate My Status and Others
  const myStatusList = statuses.filter((s) => s.user_id === currentUser?.id);
  const otherStatuses = statuses.filter((s) => s.user_id !== currentUser?.id);
  const latestMyStatus = myStatusList[0];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-obsidian-bg select-none overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-obsidian-border bg-white dark:bg-obsidian-card flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Status Updates</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2 rounded-xl bg-mint-500/10 hover:bg-mint-500/20 text-mint-600 dark:text-mint-400 font-semibold text-xs flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Status</span>
        </button>
      </div>

      <div className="p-4 space-y-6 max-w-xl">
        {/* My Status Card */}
        <div className="flex items-center gap-3.5 bg-white dark:bg-obsidian-card p-3.5 rounded-2xl border border-zinc-200/80 dark:border-obsidian-border shadow-xs">
          <div
            onClick={() => {
              if (latestMyStatus) setViewingStatus(latestMyStatus);
              else setIsAdding(true);
            }}
            className="relative cursor-pointer group"
          >
            <div
              className={`p-0.5 rounded-full ${
                latestMyStatus ? 'ring-2 ring-mint-500 ring-offset-2 ring-offset-white dark:ring-offset-obsidian-card' : ''
              }`}
            >
              <Avatar src={currentUser?.avatar_url} name={currentUser?.display_name || 'Me'} size="lg" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAdding(true);
              }}
              className="absolute -bottom-1 -right-1 bg-mint-500 hover:bg-mint-600 text-white p-1 rounded-full border-2 border-white dark:border-obsidian-card transition shadow-sm"
              title="Add status update"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <div
            onClick={() => {
              if (latestMyStatus) setViewingStatus(latestMyStatus);
              else setIsAdding(true);
            }}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">My Status</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {latestMyStatus
                ? latestMyStatus.text || 'Photo status'
                : 'Tap to add your 24h status update'}
            </p>
          </div>

          <button
            onClick={() => {
              setIsAdding(true);
              setTimeout(() => fileInputRef.current?.click(), 100);
            }}
            className="p-2.5 rounded-full bg-zinc-100 dark:bg-obsidian-surface text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
            title="Upload photo status"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Recent Updates from Contacts */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 px-1">
            Recent updates ({otherStatuses.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center p-8 text-zinc-400">
              <span className="w-5 h-5 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : otherStatuses.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500 bg-white dark:bg-obsidian-card rounded-2xl border border-zinc-200/80 dark:border-obsidian-border">
              <Clock className="w-6 h-6 mx-auto mb-2 text-zinc-400/80" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">No recent updates</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">When contacts post a status, it will appear here for 24 hours.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {otherStatuses.map((status) => (
                <div
                  key={status.id}
                  onClick={() => setViewingStatus(status)}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-obsidian-card border border-zinc-200/80 dark:border-obsidian-border hover:bg-zinc-50 dark:hover:bg-obsidian-surface cursor-pointer transition shadow-xs"
                >
                  <div className="ring-2 ring-mint-500 ring-offset-2 ring-offset-white dark:ring-offset-obsidian-card rounded-full p-0.5">
                    <Avatar src={status.avatar_url} name={status.display_name} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {status.display_name}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {formatDistanceToNow(new Date(status.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE STATUS MODAL */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-obsidian-card border border-zinc-200 dark:border-obsidian-border rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-obsidian-border">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Create Status</h2>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-obsidian-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostStatus} className="p-4 space-y-4">
              {/* Preview Box */}
              <div
                style={{ backgroundColor: selectedColor }}
                className="w-full h-48 rounded-2xl p-4 flex flex-col justify-center items-center text-center text-white relative shadow-inner overflow-hidden transition-colors"
              >
                {uploadedMediaUrl ? (
                  <img src={uploadedMediaUrl} alt="Status photo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <textarea
                    rows={3}
                    autoFocus
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder="Type your status..."
                    className="w-full bg-transparent text-center font-bold text-lg text-white placeholder-white/60 focus:outline-none resize-none"
                  />
                )}

                {uploadedMediaUrl && (
                  <button
                    type="button"
                    onClick={() => setUploadedMediaUrl(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Color Picker Palette */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Background:</span>
                <div className="flex items-center gap-1.5">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full transition transform active:scale-90 ${
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-zinc-500 scale-110' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Attachment options */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-obsidian-border">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2.5 rounded-xl bg-zinc-100 dark:bg-obsidian-surface text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  <ImageIcon className="w-4 h-4 text-mint-500" />
                  <span>{uploading ? 'Uploading Photo...' : 'Add Photo'}</span>
                </button>

                <div className="flex-1" />

                <button
                  type="submit"
                  disabled={submitting || (!statusText.trim() && !uploadedMediaUrl)}
                  className="py-2.5 px-5 rounded-xl bg-mint-500 hover:bg-mint-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-mint-500/25 transition cursor-pointer"
                >
                  {submitting ? 'Sharing...' : 'Share Status'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW STATUS MODAL */}
      {viewingStatus && (
        <div
          onClick={() => setViewingStatus(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in cursor-pointer select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: viewingStatus.bg_color || '#10b981' }}
            className="w-full max-w-sm h-[75vh] rounded-3xl p-6 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden"
          >
            {/* Story Top Bar with Progress */}
            <div>
              <div className="w-full bg-white/30 h-1 rounded-full mb-4 overflow-hidden">
                <div className="bg-white h-full w-full animate-[progress_5s_linear]" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar src={viewingStatus.avatar_url} name={viewingStatus.display_name} size="sm" />
                  <div>
                    <p className="text-xs font-bold leading-tight">{viewingStatus.display_name}</p>
                    <p className="text-[10px] opacity-75">
                      {formatDistanceToNow(new Date(viewingStatus.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setViewingStatus(null)}
                  className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Story Content */}
            <div className="my-auto flex flex-col items-center justify-center text-center px-4">
              {viewingStatus.media_url ? (
                <img
                  src={viewingStatus.media_url}
                  alt="Story"
                  className="max-h-[50vh] w-full object-contain rounded-2xl drop-shadow-lg"
                />
              ) : (
                <p className="text-2xl font-bold leading-relaxed whitespace-pre-wrap break-words drop-shadow">
                  {viewingStatus.text}
                </p>
              )}
            </div>

            <p className="text-center text-[10px] opacity-60">Tap anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
};
