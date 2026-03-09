import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import ChatRoom from "./ChatRoom";
import CallOverlay from "./CallOverlay";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function ChatLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 relative bg-white dark:bg-zinc-900">
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">👋</span>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("welcome")}</h2>
              <p>{t("noMessages")}</p>
            </div>
          } />
          <Route path="/chat/:recipientId" element={<ChatRoom />} />
        </Routes>
      </main>
      <CallOverlay />
    </div>
  );
}
