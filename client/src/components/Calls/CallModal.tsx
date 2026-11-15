import React, { useState, useEffect, useRef } from 'react';
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
  SwitchCamera,
  Lock,
  Sparkles,
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const activeCall = useStore((state) => state.activeCall);
  const acceptCall = useStore((state) => state.acceptCall);
  const endCall = useStore((state) => state.endCall);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize Camera/Mic when in a Video Call
  useEffect(() => {
    if (!activeCall || !activeCall.isActive) {
      stopMediaStream();
      return;
    }

    if (activeCall.callType === 'VIDEO') {
      startMediaStream(facingMode);
    }

    return () => {
      stopMediaStream();
    };
  }, [activeCall?.isActive, activeCall?.callType, facingMode]);

  const startMediaStream = async (facing: 'user' | 'environment') => {
    try {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: true,
        });

        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Failed to access camera/mic for call:', err);
    }
  };

  const stopMediaStream = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

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

  // Toggle Mute
  const handleToggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
      }
    }
    setIsMuted(!isMuted);
  };

  // Toggle Video Camera
  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
      }
    }
    setIsVideoOff(!isVideoOff);
  };

  // Flip Camera
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleAccept = () => {
    acceptCall();
    socket.send('call:accept', {
      toUserId: activeCall.contactId,
      chatId: activeCall.chatId,
    });
  };

  const handleDecline = async () => {
    stopMediaStream();
    socket.send('call:decline', {
      toUserId: activeCall.contactId,
      chatId: activeCall.chatId,
      reason: 'declined',
    });
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
    stopMediaStream();
    socket.send('call:end', {
      toUserId: activeCall.contactId,
      chatId: activeCall.chatId,
    });
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

  const isVideo = activeCall.callType === 'VIDEO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-3 select-none animate-fade-in">
      <div className="w-full max-w-sm h-[82vh] bg-obsidian-card border border-obsidian-border rounded-3xl p-5 flex flex-col items-center justify-between text-white shadow-2xl relative overflow-hidden">
        {/* VIDEO FEED BACKGROUND (IF VIDEO CALL) */}
        {isVideo && !isVideoOff && (
          <div className="absolute inset-0 z-0 bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            {/* Subtle Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
          </div>
        )}

        {/* Top Header & Encryption Badge */}
        <div className="z-10 flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 text-[11px] font-semibold">
            <Lock className="w-3.5 h-3.5 text-mint-400" />
            <span>End-to-End Encrypted {isVideo ? 'Video' : 'Audio'}</span>
          </div>

          {isVideo && !isVideoOff && (
            <button
              type="button"
              onClick={handleFlipCamera}
              className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition cursor-pointer"
              title="Flip camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Center Contact Info & Pulse */}
        <div className="z-10 flex flex-col items-center text-center my-auto">
          {(!isVideo || isVideoOff) && (
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
          )}

          <h2 className="text-xl font-bold tracking-tight mb-1 drop-shadow-md">
            {activeCall.contactName}
          </h2>

          <p className="text-xs text-mint-400 font-semibold drop-shadow-md">
            {activeCall.status === 'CONNECTED'
              ? formatTimer(duration)
              : activeCall.isIncoming
              ? 'Incoming call...'
              : 'Ringing...'}
          </p>
        </div>

        {/* Bottom Call Controls */}
        <div className="z-10 w-full pb-2">
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
                <span className="text-[11px] text-zinc-300 font-medium">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleAccept}
                  className="w-14 h-14 rounded-full bg-mint-500 hover:bg-mint-600 text-white flex items-center justify-center shadow-lg shadow-mint-500/30 transition transform active:scale-95 animate-bounce cursor-pointer"
                  title="Accept"
                >
                  <Phone className="w-6 h-6" />
                </button>
                <span className="text-[11px] text-mint-400 font-bold">Accept</span>
              </div>
            </div>
          ) : (
            /* Active Connected Call or Outgoing Ringing */
            <div className="space-y-5">
              {/* Audio/Video Toggles */}
              <div className="flex items-center justify-center gap-5">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`p-3.5 rounded-full transition cursor-pointer backdrop-blur-md ${
                    isMuted
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {isVideo && (
                  <button
                    type="button"
                    onClick={handleToggleVideo}
                    className={`p-3.5 rounded-full transition cursor-pointer backdrop-blur-md ${
                      isVideoOff
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/15 hover:bg-white/25 text-white'
                    }`}
                    title={isVideoOff ? 'Turn video on' : 'Turn video off'}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                )}
              </div>

              {/* Hang Up Button (Red) */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleHangUp}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 transition transform active:scale-90 cursor-pointer"
                  title="End Call"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
