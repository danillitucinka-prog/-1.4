import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Send, Paperclip, MoreVertical, Phone, Video, Smile, Trash2, Edit2, Check, CheckCheck, Globe, X, Image as ImageIcon, Search, Reply, Mic, Square, Pin, PinOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, deleteDoc, Timestamp, limit, updateDoc, setDoc, deleteField, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useLanguage } from "../context/LanguageContext";
import { useCall } from "../context/CallContext";

export default function ChatRoom() {
  const { recipientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { startCall } = useCall();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recipient, setRecipient] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editText, setEditText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<string | null>(null);
  const [chatWallpaper, setChatWallpaper] = useState<string>(localStorage.getItem("chatWallpaper") || "");
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (recipientId && user) {
      // Mark messages as read
      const markAsRead = async () => {
        const q = query(
          collection(db, "messages"),
          where("recipientId", "==", user.id),
          where("senderId", "==", recipientId),
          where("status", "==", "sent")
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(async (d) => {
          await updateDoc(d.ref, { status: "read" });
        });
      };
      if (recipientId !== "global") markAsRead();

      // Typing indicator listener
      const typingId = recipientId === "global" ? "global" : [user.id, recipientId].sort().join("_");
      const typingUnsubscribe = onSnapshot(doc(db, "typing", typingId), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const typingUsers = Object.keys(data).filter(uid => uid !== user.id && data[uid] === true);
          setOtherUserTyping(typingUsers.length > 0);
        } else {
          setOtherUserTyping(false);
        }
      });

      if (recipientId === "global") {
        setRecipient({ id: "global", username: t("globalChat"), status: "online" });
        
        const q = query(
          collection(db, "messages"),
          where("roomId", "==", "global"),
          orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: (data as any).timestamp?.toDate()
            } as any;
          });
          setMessages(msgs);
          setPinnedMessages(msgs.filter((m: any) => m.isPinned));
        });

        return () => unsubscribe();
      } else if (recipientId.startsWith("channel_")) {
        const channelId = recipientId.replace("channel_", "");
        const fetchChannel = async () => {
          const docRef = doc(db, "channels", channelId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRecipient({ id: recipientId, username: docSnap.data().name, status: "online", isChannel: true });
          }
        };
        fetchChannel();

        const q = query(
          collection(db, "messages"),
          where("roomId", "==", recipientId),
          orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: (data as any).timestamp?.toDate()
            } as any;
          });
          setMessages(msgs);
          setPinnedMessages(msgs.filter((m: any) => m.isPinned));
        });

        return () => unsubscribe();
      } else if (recipientId === "ai_assistant") {
        setRecipient({ id: "ai_assistant", username: "AI Assistant", status: "online", avatar: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png" });
        
        const q = query(
          collection(db, "messages"),
          where("roomId", "==", `ai_chat_${user.id}`),
          orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: (data as any).timestamp?.toDate()
            };
          });
          setMessages(msgs);
        });

        return () => unsubscribe();
      } else {
        // Fetch recipient info
        const fetchRecipient = async () => {
          const docRef = doc(db, "users", recipientId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRecipient({ id: docSnap.id, ...docSnap.data() });
          }
        };
        fetchRecipient();

        // Fetch messages in real-time
        const q = query(
          collection(db, "messages"),
          where("senderId", "in", [user?.id, recipientId]),
          where("recipientId", "in", [user?.id, recipientId]),
          orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: (data as any).timestamp?.toDate()
            };
          }).filter((m: any) => 
            (m.senderId === user?.id && m.recipientId === recipientId) ||
            (m.senderId === recipientId && m.recipientId === user?.id)
          );
          setMessages(msgs);
          setPinnedMessages(msgs.filter((m: any) => m.isPinned));
        });

        return () => unsubscribe();
      }
    }
  }, [recipientId, user, t]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imagePreview && !voiceBlob) || !user || !recipientId) return;

    try {
      const messageData: any = {
        senderId: user.id,
        senderName: user.username,
        senderAvatar: user.avatar || null,
        senderBio: user.bio || null,
        text: newMessage.trim(),
        timestamp: Timestamp.now(),
        status: "sent"
      };

      if (imagePreview) {
        messageData.image = imagePreview;
      }

      if (voiceBlob) {
        messageData.voice = voiceBlob;
      }

      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          senderName: replyingTo.senderName
        };
      }
  
      if (recipientId === "ai_assistant") {
        messageData.roomId = `ai_chat_${user.id}`;
        messageData.recipientId = "ai_assistant";
      } else if (recipientId === "global" || recipientId.startsWith("channel_")) {
        messageData.roomId = recipientId;
      } else {
        messageData.recipientId = recipientId;
      }

      await addDoc(collection(db, "messages"), messageData);
      setNewMessage("");
      setImagePreview(null);
      setVoiceBlob(null);
      setReplyingTo(null);

      // AI Assistant response logic
      if (recipientId === "ai_assistant") {
        setIsAITyping(true);
        const { getAIResponse } = await import("../services/geminiService");
        
        // Prepare history for AI
        const history = messages.slice(-10).map(m => ({
          role: m.senderId === user.id ? "user" : "model",
          parts: [{ text: m.text }]
        }));

        const aiResponseText = await getAIResponse(newMessage.trim(), history);
        setIsAITyping(false);

        const aiMessageData = {
          senderId: "ai_assistant",
          senderName: "AI Assistant",
          senderAvatar: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
          text: aiResponseText,
          timestamp: Timestamp.now(),
          status: "read",
          roomId: `ai_chat_${user.id}`,
          recipientId: user.id
        };

        await addDoc(collection(db, "messages"), aiMessageData);
      }
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Image too large (max 1MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, "messages", id));
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const startEditing = (msg: any) => {
    setEditingMessage(msg);
    setEditText(msg.text);
  };

  const saveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;
    try {
      await updateDoc(doc(db, "messages", editingMessage.id), {
        text: editText.trim(),
        isEdited: true
      });
      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error("Edit failed", error);
    }
  };

  const setWallpaper = (url: string) => {
    setChatWallpaper(url);
    localStorage.setItem("chatWallpaper", url);
    setShowWallpaperPicker(false);
  };

  const sendSticker = async (stickerUrl: string) => {
    if (!user || !recipientId) return;
    try {
      const messageData: any = {
        senderId: user.id,
        senderName: user.username,
        senderAvatar: user.avatar || null,
        senderBio: user.bio || null,
        text: "Sticker",
        sticker: stickerUrl,
        timestamp: Timestamp.now(),
        status: "sent"
      };

      if (recipientId === "global" || recipientId.startsWith("channel_")) {
        messageData.roomId = recipientId;
      } else {
        messageData.recipientId = recipientId;
      }

      await addDoc(collection(db, "messages"), messageData);
      setShowStickerPicker(false);
    } catch (error) {
      console.error("Failed to send sticker", error);
    }
  };

  const createPoll = async () => {
    if (!user || !recipientId || !pollQuestion.trim() || pollOptions.some(o => !o.trim())) return;
    try {
      const messageData: any = {
        senderId: user.id,
        senderName: user.username,
        senderAvatar: user.avatar || null,
        senderBio: user.bio || null,
        text: "Poll: " + pollQuestion,
        poll: {
          question: pollQuestion.trim(),
          options: pollOptions.map(o => ({ text: o.trim(), votes: [] }))
        },
        timestamp: Timestamp.now(),
        status: "sent"
      };

      if (recipientId === "global" || recipientId.startsWith("channel_")) {
        messageData.roomId = recipientId;
      } else {
        messageData.recipientId = recipientId;
      }

      await addDoc(collection(db, "messages"), messageData);
      setShowPollCreator(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
    } catch (error) {
      console.error("Failed to create poll", error);
    }
  };

  const voteInPoll = async (messageId: string, optionIndex: number) => {
    if (!user) return;
    try {
      const msgRef = doc(db, "messages", messageId);
      const msgSnap = await getDoc(msgRef);
      if (msgSnap.exists()) {
        const data = msgSnap.data();
        const poll = { ...data.poll };
        
        // Remove user's vote from all options first (single choice poll)
        poll.options = poll.options.map((opt: any) => ({
          ...opt,
          votes: opt.votes.filter((uid: string) => uid !== user.id)
        }));
        
        // Add user's vote to selected option
        poll.options[optionIndex].votes.push(user.id);
        
        await updateDoc(msgRef, { poll });
      }
    } catch (error) {
      console.error("Vote failed", error);
    }
  };

  const handleTyping = () => {
    if (!user || !recipientId) return;
    
    const typingId = recipientId === "global" ? "global" : [user.id, recipientId].sort().join("_");
    
    if (!isTyping) {
      setIsTyping(true);
      setDoc(doc(db, "typing", typingId), { [user.id]: true }, { merge: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setDoc(doc(db, "typing", typingId), { [user.id]: false }, { merge: true });
    }, 3000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceBlob(reader.result as string);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      const msgRef = doc(db, "messages", messageId);
      const msgSnap = await getDoc(msgRef);
      if (msgSnap.exists()) {
        const data = msgSnap.data();
        const currentReaction = data.reactions?.[user.id];
        
        if (currentReaction === emoji) {
          // Remove reaction
          await updateDoc(msgRef, {
            [`reactions.${user.id}`]: deleteField()
          });
        } else {
          // Add/Change reaction
          await updateDoc(msgRef, {
            [`reactions.${user.id}`]: emoji
          });
        }
      }
    } catch (error) {
      console.error("Reaction failed", error);
    }
  };

  const togglePin = async (messageId: string, isPinned: boolean) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        isPinned: !isPinned
      });
    } catch (error) {
      console.error("Pin failed", error);
    }
  };

  const clearChat = async () => {
    if (user?.role !== 'admin' && recipientId !== 'ai_assistant') return;
    if (!window.confirm(t("confirmClearChat"))) return;
    
    try {
      let q;
      if (recipientId === 'global' || recipientId?.startsWith('channel_')) {
        q = query(collection(db, "messages"), where("roomId", "==", recipientId));
      } else if (recipientId === 'ai_assistant') {
        q = query(collection(db, "messages"), where("roomId", "==", `ai_chat_${user.id}`));
      } else {
        // Clear direct messages (optional, maybe just for admin)
        q = query(
          collection(db, "messages"),
          where("senderId", "in", [user?.id, recipientId]),
          where("recipientId", "in", [user?.id, recipientId])
        );
      }
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Clear chat failed", error);
    }
  };

  const filteredMessages = messages.filter(m => 
    m.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <header className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 overflow-hidden">
            {recipientId === "global" ? (
              <Globe size={24} />
            ) : (
              recipient?.avatar ? (
                <img src={recipient.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="font-bold">{recipient?.username?.[0].toUpperCase()}</span>
              )
            )}
          </div>
            <div className="flex flex-col items-start">
                <h2 className="font-bold">
                  {recipientId === "global" ? t("globalChat") : (recipient?.username || "...")}
                </h2>
                <p className="text-xs text-zinc-500">
                  {otherUserTyping || isAITyping ? (
                    <span className="text-emerald-500 animate-pulse">{t("typing")}...</span>
                  ) : (
                    recipientId === "global" ? t("globalChatDesc") : (recipient?.status === "online" ? t("online") : t("offline"))
                  )}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {((user?.role === 'admin' && (recipientId === 'global' || recipientId?.startsWith('channel_'))) || recipientId === 'ai_assistant') && (
              <button 
                onClick={clearChat}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"
                title={t("clearChat")}
              >
                <Trash2 size={20} />
              </button>
            )}
            {recipientId !== 'ai_assistant' && recipientId !== 'global' && !recipientId?.startsWith('channel_') && (
              <>
                <button 
                  onClick={() => recipientId && startCall(recipientId, 'audio')}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
                  title={t("audioCall")}
                >
                  <Phone size={20} />
                </button>
                <button 
                  onClick={() => recipientId && startCall(recipientId, 'video')}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
                  title={t("videoCall")}
                >
                  <Video size={20} />
                </button>
              </>
            )}
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors ${showSearch ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "text-zinc-500"}`}
            >
              <Search size={20} />
            </button>
            <button 
              onClick={() => setShowWallpaperPicker(!showWallpaperPicker)}
              className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors ${showWallpaperPicker ? "text-emerald-500" : "text-zinc-500"}`}
            >
              <ImageIcon size={20} />
            </button>
            {recipientId !== 'ai_assistant' && (
              <button 
                onClick={() => setShowPollCreator(true)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
              >
                <Check size={20} />
              </button>
            )}
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"><MoreVertical size={20} /></button>
          </div>
        </header>

        {showWallpaperPicker && (
          <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top duration-200">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{language === 'ru' ? 'Выберите фон' : 'Choose Wallpaper'}</p>
            <div className="grid grid-cols-4 gap-2">
              {["", "https://images.unsplash.com/photo-1557683316-973673baf926?w=400", "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400", "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400"].map((url, i) => (
                <button 
                  key={i}
                  onClick={() => setWallpaper(url)}
                  className={`h-12 rounded-lg border-2 transition-all overflow-hidden ${chatWallpaper === url ? "border-emerald-500 scale-95" : "border-transparent"}`}
                >
                  {url ? (
                    <img src={url} alt="Wallpaper" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">Default</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {pinnedMessages.length > 0 && (
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2 overflow-hidden">
              <Pin size={14} className="text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{language === 'ru' ? 'Закрепленное сообщение' : 'Pinned Message'}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{pinnedMessages[pinnedMessages.length - 1].text}</p>
              </div>
            </div>
            <button 
              onClick={() => togglePin(pinnedMessages[pinnedMessages.length - 1].id, true)}
              className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-full text-emerald-500"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {showSearch && (
          <div className="p-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-top duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchMessages")}
                className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl outline-none text-sm"
                autoFocus
              />
            </div>
          </div>
        )}
  
        {/* Messages Area */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950/50 relative"
          style={chatWallpaper ? { backgroundImage: `url(${chatWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {chatWallpaper && <div className="absolute inset-0 bg-white/10 dark:bg-black/20 pointer-events-none" />}
          <AnimatePresence initial={false}>
            {filteredMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[70%] group relative`}>
                  <div className={`px-4 py-2 rounded-2xl shadow-sm ${
                    msg.senderId === user?.id 
                      ? "bg-emerald-500 text-white rounded-tr-none" 
                      : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none"
                  }`}>
                    {msg.replyTo && (
                      <div className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${
                        msg.senderId === user?.id 
                          ? "bg-white/10 border-white/40 text-white/80" 
                          : "bg-zinc-100 dark:bg-zinc-700 border-emerald-500 text-zinc-500"
                      }`}>
                        <p className="font-bold">{msg.replyTo.senderName}</p>
                        <p className="truncate">{msg.replyTo.text}</p>
                      </div>
                    )}
                    {(recipientId === "global" || recipientId?.startsWith("channel_")) && msg.senderId !== user?.id && (
                      <button 
                        onClick={() => setSelectedUser({ id: msg.senderId, username: msg.senderName, avatar: msg.senderAvatar, bio: msg.senderBio })}
                        className="text-[10px] font-bold text-emerald-500 mb-1 hover:underline"
                      >
                        {msg.senderName || "Unknown"}
                      </button>
                    )}
                    {msg.image && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <img src={msg.image} alt="Sent" className="max-w-full h-auto" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    {msg.voice && (
                      <div className="mb-2">
                        <audio src={msg.voice} controls className="max-w-full h-10 filter invert dark:invert-0" />
                      </div>
                    )}
                    {msg.sticker && (
                      <div className="mb-2">
                        <img src={msg.sticker} alt="Sticker" className="w-32 h-32 object-contain" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    {msg.poll && (
                      <div className="mb-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <p className="font-bold text-sm mb-3">{msg.poll.question}</p>
                        <div className="space-y-2">
                          {msg.poll.options.map((opt: any, idx: number) => {
                            const totalVotes = msg.poll.options.reduce((acc: number, o: any) => acc + o.votes.length, 0);
                            const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                            const hasVoted = opt.votes.includes(user?.id);
                            
                            return (
                              <button 
                                key={idx}
                                onClick={() => voteInPoll(msg.id, idx)}
                                className="w-full relative h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 group/opt"
                              >
                                <div 
                                  className={`absolute inset-0 transition-all duration-500 ${hasVoted ? "bg-emerald-500/20" : "bg-zinc-100 dark:bg-zinc-800"}`}
                                  style={{ width: `${percentage}%` }}
                                />
                                <div className="absolute inset-0 px-3 flex items-center justify-between text-xs">
                                  <span className="font-medium">{opt.text}</span>
                                  <span className="text-zinc-500">{percentage}% ({opt.votes.length})</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {msg.text !== "Sticker" && !msg.poll && <p className="text-sm">{msg.text}</p>}
                    
                    {msg.isEdited && (
                      <span className="text-[8px] opacity-50 block mt-0.5 italic">
                        {language === 'ru' ? 'изменено' : 'edited'}
                      </span>
                    )}
                    
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(msg.reactions).map(([uid, emoji]: [string, any]) => (
                          <span key={uid} className="text-xs bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full shadow-sm">
                            {emoji}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      msg.senderId === user?.id ? "text-emerald-100" : "text-zinc-500"
                    }`}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      {msg.senderId === user?.id && (
                        msg.status === 'read' ? <CheckCheck size={12} /> : <Check size={12} />
                      )}
                    </div>
                  </div>
                  
                  {msg.senderId === user?.id && (
                    <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEditing(msg)}
                        className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button 
                        onClick={() => togglePin(msg.id, msg.isPinned)}
                        className={`p-1.5 rounded-full transition-colors ${msg.isPinned ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`}
                      >
                        {msg.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>
                    </div>
                  )}

                  <div className={`absolute ${msg.senderId === user?.id ? "-left-8" : "-right-8"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <button 
                      onClick={() => setReplyingTo(msg)}
                      className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full"
                    >
                      <Reply size={14} />
                    </button>
                  </div>

                  {msg.senderId !== user?.id && (
                    <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {["❤️", "👍", "😂"].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-xs transition-transform hover:scale-125 ${msg.reactions?.[user?.id] === emoji ? "bg-emerald-100 dark:bg-emerald-900/40 scale-110" : ""}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
  
        {/* Input Area */}
        <footer className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800" />
              <button 
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {voiceBlob && (
            <div className="mb-2 p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic size={14} className="text-emerald-500" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Voice Message Ready</p>
              </div>
              <button onClick={() => setVoiceBlob(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-full text-emerald-500">
                <X size={14} />
              </button>
            </div>
          )}
          {replyingTo && (
            <div className="mb-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-between border-l-4 border-emerald-500 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <Reply size={14} className="text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-emerald-500">{replyingTo.senderName}</p>
                  <p className="text-xs text-zinc-500 truncate">{replyingTo.text}</p>
                </div>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-500">
                <X size={14} />
              </button>
            </div>
          )}
          {editingMessage && (
            <div className="mb-2 p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg flex items-center justify-between animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <Edit2 size={14} className="text-emerald-500 shrink-0" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">{editingMessage.text}</p>
              </div>
              <button onClick={() => setEditingMessage(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-full text-emerald-500">
                <X size={14} />
              </button>
            </div>
          )}
          <form onSubmit={editingMessage ? (e) => { e.preventDefault(); saveEdit(); } : handleSend} className="flex items-center gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageSelect}
            />
            {recipientId !== 'ai_assistant' && (
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <Paperclip size={20} />
              </button>
            )}
            <div className="flex-1 relative">
              <input
                type="text"
                value={editingMessage ? editText : newMessage}
                disabled={isRecording}
                onChange={(e) => {
                  if (editingMessage) setEditText(e.target.value);
                  else {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }
                }}
                placeholder={isRecording ? "Recording..." : t("typeMessage")}
                className="w-full pl-4 pr-10 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm disabled:opacity-50"
              />
            {recipientId !== 'ai_assistant' && (
              <button 
                type="button" 
                onClick={() => setShowStickerPicker(!showStickerPicker)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors ${showStickerPicker ? "text-emerald-500" : "text-zinc-500 hover:text-emerald-500"}`}
              >
                <Smile size={20} />
              </button>
            )}
            {showStickerPicker && (
              <div className="absolute bottom-full right-0 mb-2 p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-64 animate-in fade-in zoom-in duration-200">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.gif",
                    "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif",
                    "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif",
                    "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif",
                    "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif",
                    "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif",
                    "https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif",
                    "https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif"
                  ].map((url, i) => (
                    <button 
                      key={i}
                      onClick={() => sendSticker(url)}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-transform hover:scale-110"
                    >
                      <img src={url} alt="Sticker" className="w-10 h-10" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {!newMessage.trim() && !imagePreview && !voiceBlob && !editingMessage && recipientId !== 'ai_assistant' ? (
            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`p-2.5 rounded-xl transition-all shadow-lg ${
                isRecording 
                  ? "bg-red-500 text-white animate-pulse scale-110" 
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-emerald-500"
              }`}
            >
              {isRecording ? <Square size={20} /> : <Mic size={20} />}
            </button>
          ) : (
            <button
              type="submit"
              disabled={editingMessage ? !editText.trim() : (!newMessage.trim() && !imagePreview && !voiceBlob)}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              {editingMessage ? <Check size={20} /> : <Send size={20} />}
            </button>
          )}
        </form>
      </footer>

      {/* User Profile Modal */}
      <AnimatePresence>
        {showPollCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">{language === 'ru' ? 'Создать опрос' : 'Create Poll'}</h3>
                  <button onClick={() => setShowPollCreator(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">{language === 'ru' ? 'Вопрос' : 'Question'}</label>
                    <input 
                      type="text"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder={language === 'ru' ? 'О чем вы хотите спросить?' : 'What do you want to ask?'}
                      className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">{language === 'ru' ? 'Варианты' : 'Options'}</label>
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...pollOptions];
                            newOpts[idx] = e.target.value;
                            setPollOptions(newOpts);
                          }}
                          placeholder={`${language === 'ru' ? 'Вариант' : 'Option'} ${idx + 1}`}
                          className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                        />
                        {pollOptions.length > 2 && (
                          <button 
                            onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 5 && (
                      <button 
                        onClick={() => setPollOptions([...pollOptions, ""])}
                        className="text-sm text-emerald-500 font-bold hover:underline"
                      >
                        + {language === 'ru' ? 'Добавить вариант' : 'Add Option'}
                      </button>
                    )}
                  </div>
                  
                  <button 
                    onClick={createPoll}
                    disabled={!pollQuestion.trim() || pollOptions.some(o => !o.trim())}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 mt-4"
                  >
                    {language === 'ru' ? 'Создать' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="relative h-32 bg-emerald-500">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 pb-6 -mt-12">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-2xl bg-white dark:bg-zinc-800 p-1 shadow-lg mb-4">
                    <div className="w-full h-full rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 overflow-hidden">
                      {selectedUser.avatar ? (
                        <img src={selectedUser.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-3xl font-bold">{selectedUser.username?.[0].toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-1">{selectedUser.username}</h3>
                  <p className="text-sm text-zinc-500 mb-4">{selectedUser.id}</p>
                  
                  <div className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl text-left mb-6">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{language === 'ru' ? 'О себе' : 'Bio'}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {selectedUser.bio || (language === 'ru' ? 'Нет описания' : 'No bio yet')}
                    </p>
                  </div>

                  <div className="flex gap-2 w-full mb-2">
                    <button 
                      onClick={() => {
                        startCall(selectedUser.id, 'audio');
                        setSelectedUser(null);
                      }}
                      className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Phone size={18} />
                      {t("audioCall")}
                    </button>
                    <button 
                      onClick={() => {
                        startCall(selectedUser.id, 'video');
                        setSelectedUser(null);
                      }}
                      className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Video size={18} />
                      {t("videoCall")}
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      navigate(`/chat/${selectedUser.id}`);
                      setSelectedUser(null);
                    }}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {language === 'ru' ? 'Написать сообщение' : 'Send Message'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
