"use client";

export default function AgentControls({
  running,
  lastRun,
  onRun,
  onRefresh,
}: {
  running: boolean;
  lastRun: string | null;
  onRun: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {lastRun && (
        <span className="text-xs text-gray-500 hidden sm:block">
          Last run: {lastRun}
        </span>
      )}
      <button
        onClick={onRefresh}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        title="Refresh"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      </button>
      <button
        onClick={onRun}
        disabled={running}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          running
            ? "bg-blue-800 text-blue-200 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
        }`}
      >
        {running ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Running Agent...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Agent
          </>
        )}
      </button>
    </div>
  );
}
