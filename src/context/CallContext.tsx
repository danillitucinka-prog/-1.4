import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../firebase";
import { doc, setDoc, onSnapshot, updateDoc, collection, addDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";

interface CallContextType {
  call: any;
  incomingCall: any;
  startCall: (recipientId: string, type: 'audio' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isVideoOff: boolean;
  setIsVideoOff: (off: boolean) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [call, setCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const callDocRef = useRef<any>(null);

  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    if (!user) return;

    // Listen for incoming calls
    const unsubscribe = onSnapshot(doc(db, "calls", user.id), (snapshot) => {
      const data = snapshot.data();
      if (data && data.status === "ringing" && data.callerId !== user.id) {
        setIncomingCall(data);
      } else if (data && data.status === "ended") {
        cleanup();
      }
    });

    return () => unsubscribe();
  }, [user]);

  const cleanup = () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setCall(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const startCall = async (recipientId: string, type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      setLocalStream(stream);

      const peerConnection = new RTCPeerConnection(servers);
      pc.current = peerConnection;

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      const callData = {
        callerId: user.id,
        callerName: user.username,
        recipientId,
        type,
        status: "ringing",
        timestamp: serverTimestamp()
      };

      // Set call for recipient
      await setDoc(doc(db, "calls", recipientId), callData);
      // Set call for self to track state
      await setDoc(doc(db, "calls", user.id), callData);
      
      callDocRef.current = doc(db, "calls", recipientId);
      setCall(callData);

      // Create offer
      const offerDescription = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };

      await updateDoc(callDocRef.current, { offer });

      // Listen for answer
      onSnapshot(callDocRef.current, (snapshot) => {
        const data = snapshot.data();
        if (!peerConnection.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          peerConnection.setRemoteDescription(answerDescription);
        }
        if (data?.status === "rejected" || data?.status === "ended") {
          cleanup();
        }
      });

      // Listen for ICE candidates
      const candidatesCol = collection(callDocRef.current, "callerCandidates");
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(candidatesCol, event.candidate.toJSON());
        }
      };

      onSnapshot(collection(callDocRef.current, "recipientCandidates"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            peerConnection.addIceCandidate(candidate);
          }
        });
      });

    } catch (error) {
      console.error("Error starting call:", error);
      cleanup();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.type === 'video'
      });
      setLocalStream(stream);

      const peerConnection = new RTCPeerConnection(servers);
      pc.current = peerConnection;

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      const callId = user.id;
      callDocRef.current = doc(db, "calls", callId);
      
      const callDocSnap = await getDoc(callDocRef.current);
      const callData = callDocSnap.data() as any;
      const offerDescription = callData?.offer;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

      const answerDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };

      await updateDoc(callDocRef.current, { answer, status: "ongoing" });
      await updateDoc(doc(db, "calls", incomingCall.callerId), { status: "ongoing" });

      setCall({ ...incomingCall, status: "ongoing" });
      setIncomingCall(null);

      // ICE candidates
      const candidatesCol = collection(callDocRef.current, "recipientCandidates");
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(candidatesCol, event.candidate.toJSON());
        }
      };

      onSnapshot(collection(callDocRef.current, "callerCandidates"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            peerConnection.addIceCandidate(candidate);
          }
        });
      });

    } catch (error) {
      console.error("Error accepting call:", error);
      cleanup();
    }
  };

  const rejectCall = async () => {
    if (incomingCall) {
      await updateDoc(doc(db, "calls", user.id), { status: "rejected" });
      await updateDoc(doc(db, "calls", incomingCall.callerId), { status: "rejected" });
      cleanup();
    }
  };

  const endCall = async () => {
    if (call) {
      const otherId = call.callerId === user.id ? call.recipientId : call.callerId;
      await updateDoc(doc(db, "calls", user.id), { status: "ended" });
      await updateDoc(doc(db, "calls", otherId), { status: "ended" });
      cleanup();
    }
  };

  return (
    <CallContext.Provider value={{ 
      call, 
      incomingCall, 
      startCall, 
      acceptCall, 
      rejectCall, 
      endCall,
      localStream,
      remoteStream,
      isMuted,
      setIsMuted,
      isVideoOff,
      setIsVideoOff
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
