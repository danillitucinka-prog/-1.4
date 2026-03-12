import React, { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Search, MessageSquare, Users, Settings, LogOut, User as UserIcon, ShieldAlert, Globe, Share2, Check, Plus, X, Github, Trash2, Bot } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ThemeToggle from "./ThemeToggle";
import { motion, AnimatePresence } from "motion/react";
import { collection, onSnapshot, query, where, orderBy, addDoc, Timestamp, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useLanguage } from "../context/LanguageContext";
import SettingsModal from "./SettingsModal";
import StatisticsModal from "./StatisticsModal";
import { BarChart3 } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const { user, logout, deleteSingleUser, cleanupGuests } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "channels">("chats");
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://ais-pre-m5tly2sheggkex6ruxykwe-114628490450.europe-west3.run.app";

  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || creatingChannel) return;
    setCreatingChannel(true);
    try {
      await addDoc(collection(db, "channels"), {
        name: newChannelName.trim(),
        description: newChannelDesc.trim(),
        createdAt: Timestamp.now(),
        createdBy: user?.id
      });
      setNewChannelName("");
      setNewChannelDesc("");
      setIsCreateChannelOpen(false);
    } catch (error) {
      console.error("Failed to create channel", error);
    } finally {
      setCreatingChannel(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("username"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(u => u.id !== user?.id);
      setUsers(usersList);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "channels"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChannels(channelsList);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "messages"),
      where("recipientId", "==", user.id),
      where("status", "==", "sent")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: {[key: string]: number} = {};
      snapshot.docs.forEach(doc => {
        const senderId = doc.data().senderId;
        counts[senderId] = (counts[senderId] || 0) + 1;
      });
      setUnreadCounts(counts);
    });
    return () => unsubscribe();
  }, [user]);

  const [lastMessages, setLastMessages] = useState<{[key: string]: any}>({});

  useEffect(() => {
    // Listen to the most recent messages to update last message preview
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLastMessages = { ...lastMessages };
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const roomId = data.roomId;
        if (roomId && !newLastMessages[roomId]) {
          newLastMessages[roomId] = data;
        }
      });
      setLastMessages(newLastMessages);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u => {
    const isGuest = u.email === "guest@example.com" || (u.username && u.username.startsWith("Guest_"));
    const isMe = u.id === user?.id;
    const isAdmin = user?.role === 'admin';
    
    // If I'm an admin, I see everyone.
    // If I'm not an admin, I don't see guests (unless it's me).
    if (!isAdmin && isGuest && !isMe) return false;

    const query = search.toLowerCase();
    return u.username.toLowerCase().includes(query) ||
           u.id.toLowerCase().includes(query) ||
           (u.email && u.email.toLowerCase().includes(query));
  });

  const isEmailSearch = search.includes("@") && search.includes(".");
  const emailFound = filteredUsers.some(u => u.email?.toLowerCase() === search.toLowerCase());

  return (
    <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="p-4 border-bottom border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden border-2 border-white dark:border-zinc-900">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user?.username?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Qvieck</h1>
            <p className="text-xs text-emerald-500 font-medium">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
            title="GitHub"
          >
            <Github size={20} />
          </a>
          <button 
            onClick={() => setIsStatisticsOpen(true)}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
            title={t("statistics")}
          >
            <BarChart3 size={20} />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
            title={t("settings")}
          >
            <Settings size={20} />
          </button>
          <button onClick={logout} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex px-4 gap-2 mb-2">
        <button 
          onClick={() => setActiveTab("chats")}
          className={cn(
            "flex-1 py-2 text-sm font-medium border-b-2 transition-all",
            activeTab === "chats" ? "border-emerald-500 text-emerald-500" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          {t("chats")}
        </button>
        <button 
          onClick={() => setActiveTab("channels")}
          className={cn(
            "flex-1 py-2 text-sm font-medium border-b-2 transition-all",
            activeTab === "channels" ? "border-emerald-500 text-emerald-500" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          {t("channels")}
        </button>
      </div>

      {/* User/Channel List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chats" ? (
          <>
            {/* Email Search Helper */}
            {isEmailSearch && !emailFound && (
              <div className="p-4 mx-4 mb-4 bg-blue-500/10 dark:bg-blue-500/5 rounded-2xl border border-blue-500/20">
                <p className="text-xs text-zinc-500 mb-2">{t("noUserFound")}</p>
                <button 
                  onClick={async () => {
                    // Try to find user by exact email in Firestore
                    const q = query(collection(db, "users"), where("email", "==", search.toLowerCase()));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                      const foundUser = snap.docs[0];
                      navigate(`/chat/${foundUser.id}`);
                      setSearch("");
                    } else {
                      alert(t("noUserFound"));
                    }
                  }}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all"
                >
                  {t("searchByEmail")}
                </button>
              </div>
            )}

            {/* Share App Card */}
            <div className="p-4 mx-4 mb-4 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-emerald-500 text-white rounded-xl">
                  <Share2 size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t("shareApp")}</h4>
                  <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{t("shareAppDesc")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleShare}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {copied ? <Check size={14} /> : <Share2 size={14} />}
                  {copied ? t("linkCopied") : t("copy")}
                </button>
                <button 
                  onClick={() => { setActiveTab("channels"); setIsCreateChannelOpen(true); }}
                  className="flex-1 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  {language === 'ru' ? 'Группа' : 'Group'}
                </button>
              </div>
            </div>

            {/* AI Assistant Chat */}
            <NavLink
              to="/chat/ai_assistant"
              className={({ isActive }) => cn(
                "flex items-center gap-3 p-4 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer",
                isActive && "bg-emerald-50 dark:bg-emerald-900/10 border-r-4 border-emerald-500"
              )}
            >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-purple-600">
                <Bot size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{t("aiAssistant")}</h3>
                <p className="text-sm text-zinc-500 truncate">
                  {t("aiAssistantDesc")}
                </p>
              </div>
            </NavLink>

            {/* Global Chat */}
            <NavLink
              to="/chat/global"
              className={({ isActive }) => cn(
                "flex items-center gap-3 p-4 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer",
                isActive && "bg-emerald-50 dark:bg-emerald-900/10 border-r-4 border-emerald-500"
              )}
            >
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600">
                <Globe size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{t("globalChat")}</h3>
                <p className="text-sm text-zinc-500 truncate">
                  {lastMessages["global"] 
                    ? `${lastMessages["global"].senderName}: ${lastMessages["global"].text}`
                    : t("globalChatDesc")}
                </p>
              </div>
            </NavLink>

            {user?.role === 'admin' && filteredUsers.some(u => u.username?.startsWith("Guest_")) && (
              <div className="px-4 py-2">
                <button
                  onClick={() => {
                    if (window.confirm(t("cleanupGuests") + "?")) {
                      cleanupGuests();
                    }
                  }}
                  className="w-full py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  {t("cleanupGuests")}
                </button>
              </div>
            )}

            {filteredUsers.map(u => (
              <div key={u.id} className="group relative">
                <NavLink
                  to={`/chat/${u.id}`}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 p-4 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer",
                    isActive && "bg-emerald-50 dark:bg-emerald-900/10 border-r-4 border-emerald-500"
                  )}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden">
                      {u.avatar ? (
                        <img src={u.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="text-zinc-400" size={24} />
                      )}
                    </div>
                    {u.status === "online" && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-zinc-950 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold truncate">{u.username}</h3>
                      <span className="text-[10px] text-zinc-500">
                        {lastMessages[[user?.id, u.id].sort().join("_")]
                          ? new Date(lastMessages[[user?.id, u.id].sort().join("_")].createdAt?.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : (u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-zinc-500 truncate flex-1">
                        {lastMessages[[user?.id, u.id].sort().join("_")]
                          ? lastMessages[[user?.id, u.id].sort().join("_")].text
                          : (search && u.id.toLowerCase().includes(search.toLowerCase()) && !u.username.toLowerCase().includes(search.toLowerCase()) 
                            ? `ID: ${u.id}` 
                            : "Click to start chatting...")}
                      </p>
                      {unreadCounts[u.id] > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[20px] text-center">
                          {unreadCounts[u.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </NavLink>
                
                {user?.role === 'admin' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (window.confirm(t("confirmDeleteUser"))) {
                        deleteSingleUser(u.id);
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                    title={t("deleteUser")}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="p-2">
            {/* Create Channel Button - Now for everyone */}
            <button 
              onClick={() => setIsCreateChannelOpen(true)}
              className="w-full mb-4 p-4 flex items-center gap-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Plus size={20} />
              </div>
              <span className="font-bold">{language === 'ru' ? 'Создать группу' : t("createChannel")}</span>
            </button>
            {channels.length === 0 && (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto text-zinc-300 mb-2" size={40} />
                <p className="text-sm text-zinc-500">{language === 'ru' ? 'Каналов пока нет' : 'No channels yet'}</p>
              </div>
            )}
            {channels.map(channel => (
              <NavLink
                key={channel.id}
                to={`/chat/channel_${channel.id}`}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 p-4 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer rounded-xl",
                  isActive && "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600"
                )}
              >
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600">
                  <Users size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{channel.name}</h3>
                  <p className="text-xs text-zinc-500 truncate">
                    {lastMessages[`channel_${channel.id}`]
                      ? `${lastMessages[`channel_${channel.id}`].senderName}: ${lastMessages[`channel_${channel.id}`].text}`
                      : (channel.description || (language === 'ru' ? 'Публичный канал' : 'Public channel'))}
                  </p>
                </div>
              </NavLink>
            ))}
          </div>
        )}
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <StatisticsModal isOpen={isStatisticsOpen} onClose={() => setIsStatisticsOpen(false)} />

      {/* Create Channel Modal */}
      <AnimatePresence>
        {isCreateChannelOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="text-emerald-500" size={20} />
                  {t("createChannel")}
                </h2>
                <button onClick={() => setIsCreateChannelOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("channelName")}</label>
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="e.g. Announcements"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("channelDesc")}</label>
                  <textarea
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none h-24"
                    placeholder="What is this channel about?"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateChannelOpen(false)}
                    className="flex-1 py-2 text-zinc-500 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={creatingChannel || !newChannelName.trim()}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {creatingChannel ? "..." : t("create")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
