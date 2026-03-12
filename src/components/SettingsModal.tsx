import React, { useState } from "react";
import { X, User, Globe, Moon, Sun, Save, Settings, Trash2, Camera, Upload, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme, ThemeType } from "../context/ThemeContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, cleanupGuests, deleteAllUsers, deleteAllMessages, deleteAllChannels } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = useState(user?.username || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingMessages, setDeletingMessages] = useState(false);
  const [deletingChannels, setDeletingChannels] = useState(false);

  const handleSave = async () => {
    if (!user || !username.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        username: username.trim(),
        avatar: avatar,
        bio: bio.trim()
      });
      onClose();
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Image too large (max 1MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    await cleanupGuests();
    setCleaning(false);
  };

  const handleDeleteAllUsers = async () => {
    if (!window.confirm(t("confirmDeleteAllUsers"))) return;
    setDeletingAll(true);
    await deleteAllUsers();
    setDeletingAll(false);
    onClose();
  };

  const handleDeleteAllMessages = async () => {
    if (!window.confirm(language === 'ru' ? 'Вы уверены, что хотите удалить ВСЕ сообщения во всех чатах?' : 'Are you sure you want to delete ALL messages in all chats?')) return;
    setDeletingMessages(true);
    await deleteAllMessages();
    setDeletingMessages(false);
  };

  const handleDeleteAllChannels = async () => {
    if (!window.confirm(language === 'ru' ? 'Вы уверены, что хотите удалить ВСЕ группы?' : 'Are you sure you want to delete ALL groups?')) return;
    setDeletingChannels(true);
    await deleteAllChannels();
    setDeletingChannels(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="text-emerald-500" size={20} />
                {t("settings")}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Profile Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <User size={16} />
                  {t("profile")}
                </h3>
                
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-zinc-900 shadow-lg">
                      {avatar ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={40} className="text-zinc-400" />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                      <Camera className="text-white" size={24} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <p className="text-[10px] text-zinc-400">{t("avatarDesc")}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("username")}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'ru' ? 'О себе' : 'Bio'}</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none h-20"
                    placeholder={language === 'ru' ? 'Расскажите о себе...' : 'Tell us about yourself...'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("userId")}</label>
                  <div className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <code className="text-xs font-mono truncate max-w-[200px]">{user?.id}</code>
                    <button 
                      onClick={() => navigator.clipboard.writeText(user?.id || "")}
                      className="text-xs text-emerald-500 font-bold hover:underline"
                    >
                      {t("copy")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Selection */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Moon size={16} />
                  {t("theme")}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'classic', label: 'Classic', color: 'bg-emerald-500' },
                    { id: 'luxury', label: 'Luxury', color: 'bg-zinc-900 border border-amber-500' },
                    { id: 'brutalist', label: 'Brutalist', color: 'bg-white border-2 border-black' },
                    { id: 'organic', label: 'Organic', color: 'bg-[#5a5a40]' }
                  ].map((tItem) => (
                    <button
                      key={tItem.id}
                      onClick={() => setTheme(tItem.id as ThemeType)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        theme === tItem.id 
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" 
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${tItem.color}`}></div>
                      <span className="text-sm font-medium">{tItem.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Globe size={16} />
                  {t("language")}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage("en")}
                    className={`flex-1 py-2 rounded-xl border-2 transition-all ${
                      language === "en" 
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600" 
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLanguage("ru")}
                    className={`flex-1 py-2 rounded-xl border-2 transition-all ${
                      language === "ru" 
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600" 
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    Русский
                  </button>
                </div>
              </div>

              {/* Statistics Shortcut */}
              <div className="p-4 bg-zinc-900 text-white rounded-2xl flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-all"
                onClick={() => {
                  onClose();
                  // We need a way to open stats from here, but since Sidebar handles it, 
                  // maybe it's better to just leave it in the sidebar header.
                  // Or I can add a prop to SettingsModal to trigger it.
                  // For now, I'll just add a nice info card.
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-lg">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t("statistics")}</p>
                    <p className="text-[10px] text-zinc-400">{t("activity")}</p>
                  </div>
                </div>
              </div>

              {/* Admin Section */}
              {user?.role === 'admin' && (
                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Trash2 size={16} className="text-red-500" />
                    Admin Tools
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={handleCleanup}
                      disabled={cleaning}
                      className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                    >
                      <Trash2 size={18} />
                      {cleaning ? "..." : (language === 'ru' ? 'Удалить всех гостей' : 'Delete All Guest Users')}
                    </button>
                    <button
                      onClick={handleDeleteAllUsers}
                      disabled={deletingAll}
                      className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Trash2 size={18} />
                      {deletingAll ? "..." : (language === 'ru' ? 'Удалить ВСЕХ пользователей' : 'Purge ALL Users')}
                    </button>
                    <button
                      onClick={handleDeleteAllMessages}
                      disabled={deletingMessages}
                      className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-red-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/30"
                    >
                      <Trash2 size={18} />
                      {deletingMessages ? "..." : (language === 'ru' ? 'Очистить все сообщения' : 'Clear All Messages')}
                    </button>
                  </div>
                </div>
              )}

              {/* Domain Info Section */}
              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Globe size={16} />
                  {t("domainInfo")}
                </h3>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-3">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {t("domainDesc")}
                  </p>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">{t("authDomains")}</p>
                    <div className="flex flex-col gap-2">
                      {[
                        "ais-dev-m5tly2sheggkex6ruxykwe-114628490450.europe-west3.run.app",
                        "ais-pre-m5tly2sheggkex6ruxykwe-114628490450.europe-west3.run.app"
                      ].map(domain => (
                        <div key={domain} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <code className="text-[10px] truncate max-w-[200px]">{domain}</code>
                          <button 
                            onClick={() => navigator.clipboard.writeText(domain)}
                            className="text-[10px] text-emerald-500 font-bold hover:underline"
                          >
                            {t("copy")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-zinc-500 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {t("save")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
