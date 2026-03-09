import React, { useEffect, useRef } from "react";
import { useCall } from "../context/CallContext";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../context/LanguageContext";

export default function CallOverlay() {
  const { 
    call, 
    incomingCall, 
    acceptCall, 
    rejectCall, 
    endCall, 
    localStream, 
    remoteStream,
    isMuted,
    setIsMuted,
    isVideoOff,
    setIsVideoOff
  } = useCall();
  const { t } = useLanguage();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!call && !incomingCall) return null;

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-[100] w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 overflow-hidden"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <User className="text-white" size={40} />
            </div>
            <h3 className="text-lg font-bold mb-1">{incomingCall.callerName}</h3>
            <p className="text-sm text-zinc-500 mb-6">
              {incomingCall.type === 'video' ? t("incomingVideoCall") : t("incomingAudioCall")}
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={rejectCall}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <PhoneOff size={20} />
                {t("reject")}
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Phone size={20} />
                {t("accept")}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {call && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
        >
          <div className="relative w-full max-w-4xl aspect-video bg-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Remote Video */}
            {call.type === 'video' ? (
              remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <div className="w-32 h-32 bg-zinc-700 rounded-full flex items-center justify-center mb-4">
                    <User size={64} />
                  </div>
                  <p className="text-xl font-bold">{call.callerId === call.recipientId ? call.callerName : "Connecting..."}</p>
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <div className="w-40 h-40 bg-zinc-700 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <User size={80} />
                </div>
                <h2 className="text-2xl font-bold mb-2">{call.callerId === call.recipientId ? call.callerName : "Voice Call"}</h2>
                <p className="text-zinc-400">{call.status === 'ringing' ? t("ringing") : t("ongoing")}</p>
              </div>
            )}

            {/* Local Video Preview */}
            {call.type === 'video' && localStream && (
              <div className="absolute top-4 right-4 w-48 aspect-video bg-zinc-900 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full transition-all ${isMuted ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              {call.type === 'video' && (
                <button
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`p-4 rounded-full transition-all ${isVideoOff ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                >
                  {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
              )}

              <button
                onClick={endCall}
                className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg shadow-red-500/40"
              >
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-white text-center">
            <p className="text-zinc-400 text-sm uppercase tracking-widest mb-2">{call.type === 'video' ? t("videoCall") : t("audioCall")}</p>
            <h3 className="text-2xl font-bold">{call.callerId === call.recipientId ? call.callerName : "Active Session"}</h3>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
