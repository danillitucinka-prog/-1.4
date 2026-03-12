/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { CallProvider } from "./context/CallContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./components/Login";
import Register from "./components/Register";
import ChatLayout from "./components/ChatLayout";
import ErrorBoundary from "./components/ErrorBoundary";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CallProvider>
              <Router>
                <div className="min-h-screen bg-theme-bg text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route 
                      path="/*" 
                      element={
                        <ProtectedRoute>
                          <ChatLayout />
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>
                </div>
              </Router>
            </CallProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

