import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';
import { useStore } from '../../store/useStore.js';
import {
  Camera,
  X,
  RotateCcw,
  Check,
  SwitchCamera,
  Sparkles,
  AlertCircle,
  Upload,
} from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured?: (mediaUrl: string) => void;
  mode?: 'STORY' | 'CHAT' | 'GENERAL';
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  mode = 'GENERAL',
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start Camera Stream
  const startCamera = async (facing: 'user' | 'environment') => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this device/browser');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow permissions.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Flip Front/Back Camera
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Shutter Snap Photo
  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(dataUrl);
  };

  // Retake
  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // Confirm and upload photo
  const handleConfirmPhoto = async () => {
    if (!capturedPhoto) return;

    setUploading(true);
    try {
      const res = await api.uploadBase64(capturedPhoto, `camera-${Date.now()}.jpg`);

      if (mode === 'STORY') {
        await api.createStatusUpdate('', res.url, '#000000');
      }

      if (onPhotoCaptured) {
        onPhotoCaptured(res.url);
      }

      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save photo');
    } finally {
      setUploading(false);
    }
  };

  // Fallback native photo capture via file input (mobile/system camera)
  const handleNativeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await api.uploadFile(file);

      if (mode === 'STORY') {
        await api.createStatusUpdate('', res.url, '#000000');
      }

      if (onPhotoCaptured) {
        onPhotoCaptured(res.url);
      }

      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to process photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-3 select-none animate-fade-in">
      <div className="w-full max-w-md h-[85vh] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col justify-between relative shadow-2xl">
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden Fallback File/Camera Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleNativeFileUpload}
          className="hidden"
        />

        {/* Top Controls */}
        <div className="p-4 z-20 flex items-center justify-between text-white bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-mint-400" />
            <span className="text-xs font-bold tracking-wide uppercase">
              {capturedPhoto ? 'Review Photo' : 'Live Camera'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!capturedPhoto && !cameraError && (
              <button
                type="button"
                onClick={handleFlipCamera}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer"
                title="Flip Camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Middle Camera Viewfinder / Preview */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
          {capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Captured"
              className="w-full h-full object-cover animate-fade-in"
            />
          ) : cameraError ? (
            <div className="p-6 text-center text-white/90 max-w-xs space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-400" />
              <p className="text-sm font-semibold">Camera Not Accessible</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Browser camera permissions might be blocked, or device has no webcam. You can still take or select a photo!
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 text-white text-xs font-semibold flex items-center gap-2 mx-auto transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Open System Camera / Photos</span>
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}
        </div>

        {/* Bottom Shutter & Action Bar */}
        <div className="p-5 z-20 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center">
          {capturedPhoto ? (
            <div className="w-full flex items-center justify-between px-4">
              <button
                type="button"
                onClick={handleRetake}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmPhoto}
                disabled={uploading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-mint-500 hover:bg-mint-600 active:scale-95 text-white text-xs font-bold shadow-lg shadow-mint-500/30 transition cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{mode === 'STORY' ? 'Post to Status' : 'Use Photo'}</span>
                  </>
                )}
              </button>
            </div>
          ) : !cameraError ? (
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Upload from gallery"
              >
                <Upload className="w-5 h-5" />
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleSnap}
                className="w-18 h-18 rounded-full border-4 border-white/80 flex items-center justify-center p-1 group active:scale-90 transition cursor-pointer shadow-lg"
              >
                <div className="w-full h-full rounded-full bg-white group-hover:bg-mint-400 transition" />
              </button>

              <button
                type="button"
                onClick={handleFlipCamera}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Flip"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
