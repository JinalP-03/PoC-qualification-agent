"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PoCRequest } from "@/lib/types";
import PoCCard from "@/components/PoCCard";
import AgentControls from "@/components/AgentControls";
import StatsBar from "@/components/StatsBar";
import DetailModal from "@/components/DetailModal";
import { SignInButton, SignOutButton } from "@/components/AuthButton";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.accessToken;

  const [pocs, setPocs] = useState<PoCRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoC, setSelectedPoC] = useState<PoCRequest | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "researching" | "qualified" | "error">("all");

  const fetchPOCs = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/pocs");
      const data = await res.json();
      if (data.success) {
        setPocs(data.pocs);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch PoCs");
      }
    } catch {
      setError("Network error fetching POCs");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchPOCs();
    const ms = parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS || "30000");
    const interval = setInterval(fetchPOCs, ms);
    return () => clearInterval(interval);
  }, [fetchPOCs, isAuthenticated]);

  const handleRunAgent = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/agent", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLastRun(new Date().toLocaleTimeString());
        await fetchPOCs();
      } else {
        setError(data.error || "Agent run failed");
      }
    } catch {
      setError("Failed to trigger agent");
    } finally {
      setRunning(false);
    }
  };

  const filteredPOCs = pocs.filter((p) =>
    filter === "all" ? true : p.status === filter
  );

  // Sign-in screen
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">⚡</div>
          <h1 className="text-3xl font-bold text-white mb-2">PoC Qualification Agent</h1>
          <p className="text-gray-400 max-w-md">
            Sign in with the Google account that owns your Sheet. We'll request read/write access to Google Sheets only.
          </p>
        </div>
        <SignInButton />
        <p className="text-xs text-gray-600 max-w-sm text-center">
          Your tokens are stored in a secure, encrypted session cookie and never leave your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-blue-400">⚡</span> PoC Qualification Agent
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Auto-qualifies prospects · Routes to the right resource · Generates demo briefs
            </p>
          </div>
          <div className="flex items-center gap-4">
            <AgentControls
              running={running}
              lastRun={lastRun}
              onRun={handleRunAgent}
              onRefresh={fetchPOCs}
            />
            <SignOutButton
              name={session?.user?.name}
              image={session?.user?.image}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm flex items-center gap-2">
            <span>⚠</span> {error}
          </div>
        )}

        <StatsBar pocs={pocs} />

        {/* Filter tabs */}
        <div className="flex gap-2 mt-6 mb-4 flex-wrap">
          {(["all", "pending", "researching", "qualified", "error"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-xs opacity-70">
                ({f === "all" ? pocs.length : pocs.filter((p) => p.status === f).length})
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-500">
            <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading PoCs from Google Sheets...
          </div>
        ) : filteredPOCs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <div className="text-5xl mb-4">📋</div>
            {filter === "all" ? (
              <>
                <p className="text-lg font-medium text-gray-400">No PoC requests yet</p>
                <p className="text-sm mt-1 mb-4 text-gray-500">
                  Add rows to your Google Sheet, then run the agent
                </p>
                <button
                  onClick={handleRunAgent}
                  disabled={running}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white"
                >
                  {running ? "Running..." : "Run Agent Now"}
                </button>
              </>
            ) : (
              <p className="text-gray-400">No {filter} PoCs</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPOCs.map((poc) => (
              <PoCCard
                key={`${poc.rowIndex}-${poc.company}`}
                poc={poc}
                onClick={() => setSelectedPoC(poc)}
              />
            ))}
          </div>
        )}
      </main>

      {selectedPoC && (
        <DetailModal poc={selectedPoC} onClose={() => setSelectedPoC(null)} />
      )}
    </div>
  );
}
