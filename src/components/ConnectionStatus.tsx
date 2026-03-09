import { useState, useEffect } from "react";
import { Database, AlertCircle } from "lucide-react";

export default function ConnectionStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setStatus(data.db === "connected" ? "connected" : "disconnected");
        setError(data.error);
      } catch (e) {
        setStatus("disconnected");
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  if (status === "connected") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-red-200 dark:border-red-900/50">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">Database Disconnected</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-4 text-sm">
          The application cannot connect to the database. Please ensure MONGODB_URI is correctly configured in your environment variables.
        </p>
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-mono rounded-lg break-all">
            Error: {error}
          </div>
        )}
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
}
