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
  Volume2,
} from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const CallModal: React.FC = () => {
  const activeCall = useStore((state) => state.activeCall);
  const acceptCall = useStore((state) => state.acceptCall);
  const endCall = useStore((state) => state.endCall);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  const isVideo = activeCall?.callType === 'VIDEO';

  // 1. Initialize Local Media (Mic & Camera)
  const initLocalStream = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC mediaDevices not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo
          ? {
              facingMode,
              width: { ideal: 640 },
              height: { ideal: 480 },
            }
          : false,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current && isVideo) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      return stream;
    } catch (err) {
      console.warn('[WebRTC] Local media error:', err);
      return null;
    }
  };

  // 2. Setup RTCPeerConnection
  const setupPeerConnection = (stream: MediaStream) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks to send voice & video
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote tracks received from peer
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
          setHasRemoteAudio(true);
        }
        if (remoteVideoRef.current && isVideo) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
      }
    };

    // Send ICE candidates to peer over WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate && activeCall) {
        socket.send('call:signal', {
          toUserId: activeCall.contactId,
          chatId: activeCall.chatId,
          signalData: { type: 'ice', candidate: event.candidate.toJSON() },
        });
      }
    };

    return pc;
  };

  // 3. Initiate WebRTC Offer (Caller)
  const createAndSendOffer = async (pc: RTCPeerConnection) => {
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await pc.setLocalDescription(offer);

      socket.send('call:signal', {
        toUserId: activeCall!.contactId,
        chatId: activeCall!.chatId,
        signalData: { type: 'offer', sdp: offer },
      });
    } catch (err) {
      console.error('[WebRTC] Error creating offer:', err);
    }
  };

  // 4. Handle Incoming WebRTC Signals
  useEffect(() => {
    if (!activeCall || !activeCall.isActive) return;

    const unsubSignal = socket.on('call:signal', async ({ signalData, fromUserId }) => {
      if (fromUserId !== activeCall.contactId) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (signalData.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));

          // Drain queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const cand = iceCandidatesQueue.current.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.send('call:signal', {
            toUserId: activeCall.contactId,
            chatId: activeCall.chatId,
            signalData: { type: 'answer', sdp: answer },
          });
        } else if (signalData.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));

          while (iceCandidatesQueue.current.length > 0) {
            const cand = iceCandidatesQueue.current.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } else if (signalData.type === 'ice') {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } else {
            iceCandidatesQueue.current.push(signalData.candidate);
          }
        }
      } catch (err) {
        console.error('[WebRTC] Signal handling error:', err);
      }
    });

    return () => {
      unsubSignal();
    };
  }, [activeCall?.isActive, activeCall?.contactId]);

  // 5. Manage Lifecycle & Stream Connection
  useEffect(() => {
    if (!activeCall || !activeCall.isActive) {
      cleanupCallMedia();
      return;
    }

    let isCurrent = true;

    async function startCallFlow() {
      const stream = await initLocalStream();
      if (!stream || !isCurrent) return;

      const pc = setupPeerConnection(stream);

      // If caller and already connected, send offer
      if (!activeCall?.isIncoming && activeCall?.status === 'CONNECTED') {
        await createAndSendOffer(pc);
      }
    }

    startCallFlow();

    return () => {
      isCurrent = false;
    };
  }, [activeCall?.isActive, activeCall?.status]);

  const cleanupCallMedia = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    iceCandidatesQueue.current = [];
    setHasRemoteAudio(false);
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
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
      }
    }
    setIsMuted(!isMuted);
  };

  // Toggle Video Camera
  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
      }
    }
    setIsVideoOff(!isVideoOff);
  };

  // Flip Camera
  const handleFlipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isVideo && localStreamRef.current && peerConnectionRef.current) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
          audio: false,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.warn('Failed to switch camera:', err);
      }
    }
  };

  const handleAccept = async () => {
    acceptCall();
    socket.send('call:accept', {
      toUserId: activeCall.contactId,
      chatId: activeCall.chatId,
    });

    if (peerConnectionRef.current) {
      await createAndSendOffer(peerConnectionRef.current);
    }
  };

  const handleDecline = async () => {
    cleanupCallMedia();
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
    cleanupCallMedia();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-3 select-none animate-fade-in">
      {/* Hidden Audio Element for Remote Voice Playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="w-full max-w-sm h-[82vh] bg-obsidian-card border border-obsidian-border rounded-3xl p-5 flex flex-col items-center justify-between text-white shadow-2xl relative overflow-hidden">
        {/* REMOTE VIDEO FEED (IF VIDEO CALL) */}
        {isVideo && (
          <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* PiP Local Video View */}
            {!isVideoOff && (
              <div className="absolute top-16 right-4 w-28 h-40 bg-zinc-900 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
          </div>
        )}

        {/* Top Header & Encryption Badge */}
        <div className="z-10 flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 text-[11px] font-semibold">
            <Lock className="w-3.5 h-3.5 text-mint-400" />
            <span>End-to-End Encrypted {isVideo ? 'Video' : 'Voice'}</span>
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

          <p className="text-xs text-mint-400 font-semibold drop-shadow-md flex items-center gap-1">
            {activeCall.status === 'CONNECTED' ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-mint-400 animate-pulse" />
                <span>{formatTimer(duration)} (Live Voice)</span>
              </>
            ) : activeCall.isIncoming ? (
              'Incoming call...'
            ) : (
              'Ringing...'
            )}
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
