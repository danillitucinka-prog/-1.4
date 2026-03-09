import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Send, Paperclip, MoreVertical, Phone, Video, Smile, Trash2, Edit2, Check, CheckCheck, Globe, X, Image as ImageIcon, Search, Reply, Mic, Square, Pin, PinOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, deleteDoc, Timestamp, limit, updateDoc, setDoc, deleteField, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useLanguage } from "../context/LanguageContext";
import { useCall } from "../context/CallContext";

export default function ChatRoom() {
  const { recipientId } = useParams();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { startCall } = useCall();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recipient, setRecipient] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
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

      if (recipientId === "global" || recipientId.startsWith("channel_")) {
        messageData.roomId = recipientId;
      } else {
        messageData.recipientId = recipientId;
      }

      await addDoc(collection(db, "messages"), messageData);
      setNewMessage("");
      setImagePreview(null);
      setVoiceBlob(null);
      setReplyingTo(null);
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

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      const msgRef = doc(db, "messages", messageId);
      await updateDoc(msgRef, {
        [`reactions.${user.id}`]: emoji
      });
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
    if (user?.role !== 'admin') return;
    if (!window.confirm(t("confirmClearChat"))) return;
    
    try {
      let q;
      if (recipientId === 'global' || recipientId?.startsWith('channel_')) {
        q = query(collection(db, "messages"), where("roomId", "==", recipientId));
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
                  {otherUserTyping ? (
                    <span className="text-emerald-500 animate-pulse">{t("typing")}...</span>
                  ) : (
                    recipientId === "global" ? t("globalChatDesc") : (recipient?.status === "online" ? t("online") : t("offline"))
                  )}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (recipientId === 'global' || recipientId?.startsWith('channel_')) && (
              <button 
                onClick={clearChat}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"
                title={t("clearChat")}
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={() => recipientId && startCall(recipientId, 'audio')}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
            >
              <Phone size={20} />
            </button>
            <button 
              onClick={() => recipientId && startCall(recipientId, 'video')}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
            >
              <Video size={20} />
            </button>
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors ${showSearch ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "text-zinc-500"}`}
            >
              <Search size={20} />
            </button>
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"><MoreVertical size={20} /></button>
          </div>
        </header>

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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950/50">
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
                    <p className="text-sm">{msg.text}</p>
                    
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
                          onClick={() => addReaction(msg.id, emoji)}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-xs"
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
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              <Paperclip size={20} />
            </button>
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
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-emerald-500">
              <Smile size={20} />
            </button>
          </div>
          {!newMessage.trim() && !imagePreview && !voiceBlob && !editingMessage ? (
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

                  <button 
                    onClick={() => {
                      // Logic to start a direct chat
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
