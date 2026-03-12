import React, { useState, useEffect } from "react";
import { X, BarChart3, MessageSquare, Users, TrendingUp, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StatisticsModal({ isOpen, onClose }: StatisticsModalProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Personal stats: Messages sent
        const personalMsgQuery = query(collection(db, "messages"), where("senderId", "==", user.id));
        const personalMsgSnap = await getDocs(personalMsgQuery);
        const messagesSent = personalMsgSnap.size;

        let adminData = null;
        if (user.role === 'admin') {
          const usersSnap = await getDocs(collection(db, "users"));
          const totalUsers = usersSnap.size;
          
          const allMsgsSnap = await getDocs(collection(db, "messages"));
          const totalMessages = allMsgsSnap.size;

          adminData = {
            totalUsers,
            totalMessages,
            activeUsers: usersSnap.docs.filter(d => d.data().status === 'online').length
          };
        }

        // Chart data: messages in last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          last7Days.push({
            date: date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' }),
            fullDate: date,
            count: 0
          });
        }

        // This is a bit heavy for client side if there are many messages, 
        // but for a small app it's fine. In production we'd use aggregation or cloud functions.
        const recentMsgsQuery = query(
          collection(db, "messages"), 
          where("timestamp", ">=", Timestamp.fromDate(last7Days[0].fullDate))
        );
        const recentMsgsSnap = await getDocs(recentMsgsQuery);
        
        recentMsgsSnap.docs.forEach(doc => {
          const msgDate = doc.data().timestamp?.toDate();
          if (msgDate) {
            const dayIndex = last7Days.findIndex(d => 
              d.fullDate.getDate() === msgDate.getDate() && 
              d.fullDate.getMonth() === msgDate.getMonth()
            );
            if (dayIndex !== -1) {
              last7Days[dayIndex].count++;
            }
          }
        });

        setChartData(last7Days);
        setStats({
          messagesSent,
          ...adminData
        });
      } catch (error) {
        console.error("Failed to fetch statistics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isOpen, user, language]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="text-emerald-500" size={20} />
                {t("statistics")}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto max-h-[80vh]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-zinc-500 animate-pulse">Loading statistics...</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500 text-white rounded-lg">
                          <MessageSquare size={18} />
                        </div>
                        <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t("messagesSent")}</h4>
                      </div>
                      <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats?.messagesSent}</p>
                    </div>

                    {user?.role === 'admin' && (
                      <>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500 text-white rounded-lg">
                              <Users size={18} />
                            </div>
                            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{t("totalUsers")}</h4>
                          </div>
                          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats?.totalUsers}</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/20">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500 text-white rounded-lg">
                              <TrendingUp size={18} />
                            </div>
                            <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{t("activeUsers")}</h4>
                          </div>
                          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats?.activeUsers}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Chart Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={16} />
                      {t("activity")} (7 {language === 'ru' ? 'дней' : 'days'})
                    </h3>
                    <div className="h-64 w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#888888' }} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#888888' }} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#18181b', 
                              border: 'none', 
                              borderRadius: '12px',
                              color: '#fff'
                            }}
                            itemStyle={{ color: '#10b981' }}
                            cursor={{ fill: '#88888811' }}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#10b981" 
                            radius={[4, 4, 0, 0]} 
                            barSize={30}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {user?.role === 'admin' && (
                    <div className="p-4 bg-zinc-900 text-white rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest mb-1">{t("totalMessages")}</p>
                        <p className="text-2xl font-bold">{stats?.totalMessages}</p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-xl">
                        <TrendingUp size={24} className="text-emerald-400" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                {t("cancel")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
