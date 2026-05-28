"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
interface Run {
  started_at: string;
  error_message: string;
  filename: string;
  environment: string;
  status: "success" | "failed";
  pr_url: string | null;
  test_passed: boolean | null;
  branch?: string;
  completed_at?: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    failed: "bg-red-500/20 text-red-300 border border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? "bg-zinc-700 text-zinc-300"}`}>
      {status}
    </span>
  );
}

function TestBadge({ passed }: { passed: boolean | null }) {
  if (passed === null) return <span className="text-zinc-500 text-xs">—</span>;
  return passed ? (
    <span className="text-emerald-400 text-xs">✅ pass</span>
  ) : (
    <span className="text-red-400 text-xs">❌ fail</span>
  );
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Home() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  const fetchRuns = () => {
    fetch(`${API}/runs`)
      .then((r) => r.json())
      .then(setRuns)
      .catch(() => {});
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);

    const es = new EventSource(`${API}/logs/stream`);
    es.onmessage = (e) => {
      setLogs((prev) => [...prev.slice(-499), e.data]);
    };

    return () => {
      clearInterval(interval);
      es.close();
    };
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const trigger = async () => {
    setTriggering(true);
    setTriggerMsg("");
    try {
      const r = await fetch(`${API}/trigger`, { method: "POST" });
      const data = await r.json();
      setTriggerMsg(data.message ?? "Pipeline started");
      setTimeout(fetchRuns, 3000);
    } catch {
      setTriggerMsg("Failed to reach server");
    } finally {
      setTriggering(false);
      setTimeout(() => setTriggerMsg(""), 4000);
    }
  };

  const successCount = runs.filter((r) => r.status === "success").length;
  const failCount = runs.filter((r) => r.status === "failed").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔧</span>
          <div>
            <h1 className="text-lg font-bold text-white">DevLoop</h1>
            <p className="text-xs text-zinc-500">Production incident resolution agent</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-400">{successCount} fixed</span>
            <span className="text-red-400">{failCount} failed</span>
            <span className="text-zinc-500">{runs.length} total</span>
          </div>
          <button
            onClick={trigger}
            disabled={triggering}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
          >
            {triggering ? "Running..." : "▶ Trigger Demo"}
          </button>
        </div>
      </header>

      {triggerMsg && (
        <div className="bg-indigo-900/40 border-b border-indigo-700/50 px-6 py-2 text-sm text-indigo-300">
          {triggerMsg}
        </div>
      )}

      <div className="flex" style={{ height: "calc(100vh - 65px)" }}>
        {/* Left: Run history */}
        <div className="w-1/2 border-r border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
            Run History
          </div>
          <div className="flex-1 overflow-y-auto">
            {runs.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 text-sm">
                No runs yet. Click &quot;Trigger Demo&quot; to start.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                    <th className="px-4 py-2 text-left">Error</th>
                    <th className="px-4 py-2 text-left">File</th>
                    <th className="px-4 py-2 text-left">Tests</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">PR</th>
                    <th className="px-4 py-2 text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3 max-w-45">
                        <span className="text-red-300 text-xs truncate block" title={run.error_message}>
                          {run.error_message.length > 40
                            ? run.error_message.slice(0, 40) + "…"
                            : run.error_message}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{run.filename}</td>
                      <td className="px-4 py-3">
                        <TestBadge passed={run.test_passed} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-3">
                        {run.pr_url ? (
                          <a
                            href={run.pr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 text-xs underline"
                          >
                            View PR ↗
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                        {timeAgo(run.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Live logs */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider flex items-center justify-between">
            <span>Live Logs</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-500">streaming</span>
            </span>
          </div>
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed space-y-0.5"
          >
            {logs.length === 0 ? (
              <p className="text-zinc-600">Waiting for logs...</p>
            ) : (
              logs.map((line, i) => {
                const isError = line.includes("[ERROR]");
                const isWarn = line.includes("[WARNING]");
                const isInfo = line.includes("[INFO]");
                const color = isError
                  ? "text-red-400"
                  : isWarn
                  ? "text-yellow-400"
                  : isInfo
                  ? "text-zinc-300"
                  : "text-zinc-500";
                return (
                  <div key={i} className={color}>
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
