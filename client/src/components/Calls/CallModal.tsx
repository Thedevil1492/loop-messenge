import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore.js';
import { socket } from '../../services/socket.js';
import { api } from '../../services/api.js';
import { Avatar } from '../UI/Avatar.js';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Lock,
  Sparkles,
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const activeCall = useStore((state) => state.activeCall);
  const acceptCall = useStore((state) => state.acceptCall);
  const endCall = useStore((state) => state.endCall);
  const currentUser = useStore((state) => state.currentUser);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);

  // Timer for connected call
  useEffect(() => {
    let timer: number | null = null;
    if (activeCall?.status === 'CONNECTED') {
      timer = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall?.status]);

  if (!activeCall || !activeCall.isActive) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    acceptCall();
    socket.send('call:accept', {
      toUserId: activeCall.contactId,
      chatId: activeCall.chatId,
    });
  };

  const handleDecline = async () => {
    socket.send('call:decline', {
      toUserId: activeCall.contactId,
      chatId: activeCall.chatId,
      reason: 'declined',
    });
    // Log missed / declined call
    try {
      await api.logCall({
        receiverId: activeCall.contactId,
        chatId: activeCall.chatId,
        type: activeCall.callType,
        status: 'DECLINED',
        duration: 0,
      });
    } catch {}
    endCall();
  };

  const handleHangUp = async () => {
    socket.send('call:end', {
      toUserId: activeCall.contactId,
      chatId: activeCall.chatId,
    });
    // Log completed call
    try {
      await api.logCall({
        receiverId: activeCall.contactId,
        chatId: activeCall.chatId,
        type: activeCall.callType,
        status: duration > 0 ? 'COMPLETED' : 'MISSED',
        duration,
      });
    } catch {}
    endCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-obsidian-card border border-obsidian-border rounded-3xl p-6 flex flex-col items-center justify-between min-h-[500px] text-white shadow-2xl relative overflow-hidden">
        {/* Top Encryption Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-[11px] font-semibold">
          <Lock className="w-3.5 h-3.5 text-mint-400" />
          <span>Loop End-to-End Encrypted {activeCall.callType === 'VIDEO' ? 'Video' : 'Audio'}</span>
        </div>

        {/* Center Contact Info & Pulse Animation */}
        <div className="flex flex-col items-center text-center my-auto">
          <div className="relative mb-5">
            {activeCall.status === 'RINGING' && (
              <div className="absolute inset-0 rounded-full bg-mint-500/20 animate-ping duration-1000" />
            )}
            <div className="relative ring-4 ring-mint-500/30 rounded-full p-1 bg-obsidian-card">
              <Avatar
                src={activeCall.contactAvatar}
                name={activeCall.contactName}
                size="lg"
                className="w-24 h-24 text-2xl"
              />
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight mb-1">{activeCall.contactName}</h2>

          <p className="text-xs text-mint-400 font-medium">
            {activeCall.status === 'CONNECTED'
              ? formatTimer(duration)
              : activeCall.isIncoming
              ? 'Incoming call...'
              : 'Ringing...'}
          </p>
        </div>

        {/* Controls */}
        <div className="w-full">
          {activeCall.status === 'RINGING' && activeCall.isIncoming ? (
            /* Incoming Call Actions: Accept (Green) or Decline (Red) */
            <div className="flex items-center justify-around w-full px-6">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleDecline}
                  className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition transform active:scale-95 cursor-pointer"
                  title="Decline"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-[11px] text-zinc-400">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleAccept}
                  className="w-14 h-14 rounded-full bg-mint-500 hover:bg-mint-600 text-white flex items-center justify-center shadow-lg shadow-mint-500/30 transition transform active:scale-95 animate-bounce cursor-pointer"
                  title="Answer"
                >
                  <Phone className="w-6 h-6" />
                </button>
                <span className="text-[11px] text-mint-400 font-semibold">Answer</span>
              </div>
            </div>
          ) : (
            /* Connected or Outgoing Call Controls */
            <div className="flex flex-col items-center gap-6 w-full">
              {activeCall.status === 'CONNECTED' && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3.5 rounded-full transition ${
                      isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {activeCall.callType === 'VIDEO' && (
                    <button
                      onClick={() => setIsVideoOff(!isVideoOff)}
                      className={`p-3.5 rounded-full transition ${
                        isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                      title={isVideoOff ? 'Turn video on' : 'Turn video off'}
                    >
                      {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                  )}

                  <button
                    onClick={() => alert('Speaker switched')}
                    className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                    title="Speakerphone"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              )}

              <button
                onClick={handleHangUp}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition transform active:scale-95 cursor-pointer"
                title="Hang Up"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
