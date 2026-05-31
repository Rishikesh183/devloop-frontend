"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../theme-toggle";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "https://devloop-qtn8.onrender.com";
// const API = "http://localhost:8000";

interface Run {
  id?: string;
  started_at: string;
  error_message: string;
  filename: string;
  environment: string;
  status: "success" | "failed" | "running";
  pr_url: string | null;
  test_passed: boolean | null;
  branch?: string;
  completed_at?: string;
}

interface User {
  authenticated: boolean;
  user_id?: string;
  github_login?: string;
  github_repo?: string;
  slack_connected?: boolean;
  preferred_model?: string;
  has_user_key?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    failed: "bg-red-500/20 text-red-300 border border-red-500/30",
    running: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? "bg-zinc-700 text-zinc-300"}`}>
      {status}
    </span>
  );
}

function TestBadge({ passed }: { passed: boolean | null }) {
  if (passed === null) return <span className="text-zinc-500 text-xs">—</span>;
  return passed
    ? <span className="text-emerald-400 text-xs">✅ pass</span>
    : <span className="text-red-400 text-xs">❌ fail</span>;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

interface Repo {
  id: string;
  repo: string;
  base_branch: string;
  sentry_secret?: string;
}

function ConnectPanel({ user, onUpdate, onTriggerRepo, onTriggerDemo }: {
  user: User;
  onUpdate: () => void;
  onTriggerRepo: (repo: string) => void;
  onTriggerDemo: () => void;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [newRepo, setNewRepo] = useState("");
  const [newBranch, setNewBranch] = useState("main");
  const [newSentry, setNewSentry] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [modelKey, setModelKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [savingModel, setSavingModel] = useState(false);

  const fetchRepos = () => {
    fetch(`${API}/me/repos`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setRepos(data) : setRepos([]))
      .catch(() => {});
  };

  useEffect(() => {
    if (user.authenticated) fetchRepos();
  }, [user.authenticated]);

  const addRepo = async () => {
    if (!newRepo.trim()) return;
    setAdding(true);
    await fetch(`${API}/me/repos`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: newRepo.trim(), branch: newBranch, sentry_secret: newSentry || undefined }),
    });
    setAdding(false);
    setNewRepo(""); setNewBranch("main"); setNewSentry(""); setShowAdd(false);
    fetchRepos();
    onUpdate();
  };

  const removeRepo = async (repo: string) => {
    await fetch(`${API}/me/repos/${encodeURIComponent(repo)}`, { method: "DELETE", credentials: "include" });
    fetchRepos();
  };

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50">
      {/* Top bar */}
      <div className="px-6 py-3 flex items-center gap-6 flex-wrap">
        {/* GitHub */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs">GitHub:</span>
          {user.authenticated
            ? <span className="text-emerald-400 text-xs">✓ {user.github_login}</span>
            : <a href={`${API}/auth/github`} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded transition-colors">Connect GitHub</a>
          }
        </div>

        {/* Slack */}
        {user.authenticated && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs">Slack:</span>
            {user.slack_connected
              ? <span className="text-emerald-400 text-xs">✓ connected</span>
              : <a href={`${API}/auth/slack`} className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded transition-colors">Connect Slack</a>
            }
          </div>
        )}

        {/* Add repo button + Sentry info */}
        {user.authenticated && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(!showAdd)}
              className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded transition-colors">
              {showAdd ? "✕ Cancel" : "+ Add Repo"}
            </button>
            <details className="relative">
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300 text-xs select-none list-none px-1.5 py-0.5 border border-zinc-700 rounded" title="Sentry setup info">
                ℹ Sentry
              </summary>
              <div className="absolute left-0 top-7 z-50 w-80 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-xl text-xs text-zinc-300 space-y-2">
                <p className="font-semibold text-white">Connecting Sentry to DevLoop</p>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                  <li>Open your <a href="https://sentry.io/settings/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300">Sentry project settings</a></li>
                  <li>Go to <strong className="text-zinc-300">Integrations → Webhooks</strong></li>
                  <li>Add webhook URL:<br /><code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 break-all">https://devloop-qtn8.onrender.com/webhook/sentry</code></li>
                  <li>Enable <strong className="text-zinc-300">issue</strong> events</li>
                  <li>Copy the <strong className="text-zinc-300">Signing Secret</strong> → paste in &quot;Sentry secret&quot; field above</li>
                </ol>
                <p className="text-zinc-600 pt-1 border-t border-zinc-800">Without a Sentry secret the webhook still works — secret just verifies payload authenticity.</p>
              </div>
            </details>
          </div>
        )}

        {/* Model settings */}
        {user.authenticated && (
          <button onClick={() => setShowModelSettings(!showModelSettings)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs rounded border border-zinc-700 transition-colors">
            {user.preferred_model ? `⚡ ${user.preferred_model.split("/").pop()}` : "⚙ LLM"}
          </button>
        )}

        {/* Logout */}
        {user.authenticated && (
          <button onClick={async () => {
            await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
            onUpdate();
          }} className="ml-auto text-zinc-600 hover:text-zinc-400 text-xs">
            Logout
          </button>
        )}
      </div>

      {/* Model settings panel */}
      {showModelSettings && user.authenticated && (
        <div className="px-6 pb-4 pt-1 border-t border-zinc-800 flex flex-col gap-3">
          <p className="text-zinc-500 text-xs pt-2">Your OpenRouter key + model overrides the default free pool for your runs.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={modelKey} onChange={(e) => setModelKey(e.target.value)}
              placeholder={user.has_user_key ? "sk-or-v1-... (leave blank to keep)" : "sk-or-v1-... (your OpenRouter key)"}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded w-72 focus:outline-none focus:border-indigo-500" />
            <select value={modelName} onChange={(e) => setModelName(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded focus:outline-none focus:border-indigo-500">
              <option value="">— pick model (optional) —</option>
              <optgroup label="Free (OpenRouter)">
                <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (free)</option>
                <option value="qwen/qwen3-coder:free">Qwen3 Coder (free)</option>
                <option value="deepseek/deepseek-v4-flash:free">DeepSeek V4 Flash (free)</option>
                <option value="google/gemma-3-27b-it:free">Gemma 3 27B (free)</option>
              </optgroup>
              <optgroup label="Codex (your key required)">
                <option value="openai/codex-mini-latest">OpenAI Codex Mini</option>
                <option value="openai/gpt-5-codex">OpenAI GPT-5 Codex</option>
              </optgroup>
              <optgroup label="Paid (your key required)">
                <option value="openai/gpt-4o">GPT-4o</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                <option value="anthropic/claude-sonnet-4-5">Claude Sonnet 4.5</option>
                <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="deepseek/deepseek-r1">DeepSeek R1</option>
              </optgroup>
            </select>
            <button disabled={savingModel || (!modelKey && !modelName)}
              onClick={async () => {
                setSavingModel(true);
                const body: Record<string, string> = {};
                if (modelKey) body.user_openrouter_key = modelKey;
                if (modelName) body.preferred_model = modelName;
                await fetch(`${API}/me/settings`, {
                  method: "PATCH", credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                setSavingModel(false);
                setModelKey(""); setShowModelSettings(false);
                onUpdate();
              }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded disabled:opacity-40">
              {savingModel ? "..." : "Save"}
            </button>
            {(user.preferred_model || user.has_user_key) && (
              <button onClick={async () => {
                await fetch(`${API}/me/settings`, {
                  method: "PATCH", credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ preferred_model: "", user_openrouter_key: "" }),
                });
                onUpdate();
              }} className="text-zinc-600 hover:text-red-400 text-xs">
                Reset to free pool
              </button>
            )}
          </div>
          {user.preferred_model && (
            <p className="text-emerald-500 text-xs">Active: {user.preferred_model} {user.has_user_key ? "· custom key" : "· default keys"}</p>
          )}
        </div>
      )}

      {/* Add repo form */}
      {showAdd && (
        <div className="px-6 pb-3 flex items-center gap-2 flex-wrap">
          <input value={newRepo} onChange={(e) => setNewRepo(e.target.value)}
            placeholder="owner/repo" onKeyDown={(e) => e.key === "Enter" && addRepo()}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded w-44 focus:outline-none focus:border-indigo-500" />
          <input value={newBranch} onChange={(e) => setNewBranch(e.target.value)}
            placeholder="branch"
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded w-24 focus:outline-none focus:border-indigo-500" />
          <input value={newSentry} onChange={(e) => setNewSentry(e.target.value)}
            placeholder="Sentry secret (optional)"
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded w-48 focus:outline-none focus:border-indigo-500" />
          <button onClick={addRepo} disabled={adding || !newRepo.trim()}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded disabled:opacity-40">
            {adding ? "..." : "Add"}
          </button>
        </div>
      )}

      {/* Repo list */}
      {user.authenticated && repos.length > 0 && (
        <div className="px-6 pb-3 flex gap-2 flex-wrap">
          {repos.map((r) => (
            <div key={r.id} className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded px-2 py-1">
              <span className="text-zinc-300 text-xs">{r.repo}</span>
              <span className="text-zinc-600 text-xs">:{r.base_branch}</span>
              {r.sentry_secret && <span className="text-emerald-600 text-xs" title="Sentry connected">●</span>}
              <button onClick={() => onTriggerRepo(r.repo)}
                className="text-indigo-400 hover:text-indigo-300 text-xs ml-1" title="Trigger on this repo">▶</button>
              <button onClick={() => removeRepo(r.repo)}
                className="text-zinc-600 hover:text-red-400 text-xs ml-0.5" title="Remove">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Not connected — demo CTA */}
      {!user.authenticated && (
        <div className="px-6 pb-3 flex items-center gap-3">
          <span className="text-zinc-600 text-xs">No prod repo? </span>
          <button onClick={onTriggerDemo}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded transition-colors">
            🚀 Try Demo Repo
          </button>
          <span className="text-zinc-600 text-xs">— runs DevLoop on a real buggy Python app</span>
        </div>
      )}
    </div>
  );
}

function DemoConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚀</span>
          <div>
            <h2 className="text-white font-bold text-lg">Run Demo Pipeline?</h2>
            <p className="text-zinc-500 text-xs">This will consume LLM API tokens</p>
          </div>
        </div>

        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4 space-y-2 text-sm text-zinc-300">
          <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">What happens next</p>
          <div className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">1.</span><span>DevLoop reads a live bug from <code className="text-emerald-400 text-xs">rishikesh183/devloop-demo-app</code></span></div>
          <div className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">2.</span><span>Two-LLM pipeline diagnoses &amp; writes a fix</span></div>
          <div className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">3.</span><span>Fix is tested in a sandbox</span></div>
          <div className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">4.</span><span>A real PR is opened on the demo repo</span></div>
        </div>

        <p className="text-zinc-500 text-xs">Watch the live logs on the right as the agent works. The whole run takes ~30–60 seconds.</p>

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors border border-zinc-700">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors">
            Yes, run the demo →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState("");
  const [user, setUser] = useState<User>({ authenticated: false });
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const fetchMe = async () => {
    try {
      const r = await fetch(`${API}/me`, { credentials: "include" });
      setUser(await r.json());
    } catch { setUser({ authenticated: false }); }
  };

  const fetchRuns = () => {
    fetch(`${API}/runs`, { credentials: "include" })
      .then((r) => r.json())
      .then(setRuns)
      .catch(() => {});
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) {
      window.history.replaceState({}, "", "/dashboard");
    }

    let cancelled = false;

    fetch(`${API}/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setUser(data); })
      .catch(() => {});

    fetch(`${API}/runs`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setRuns(data); })
      .catch(() => {});

    const interval = setInterval(() => {
      fetch(`${API}/runs`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => { if (!cancelled) setRuns(data); })
        .catch(() => {});
    }, 5000);

    const es = new EventSource(`${API}/logs/stream`, { withCredentials: true });
    es.onmessage = (e) => { if (!cancelled) setLogs((prev) => [...prev.slice(-499), e.data]); };

    return () => { cancelled = true; clearInterval(interval); es.close(); };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const trigger = () => setShowDemoConfirm(true);

  const triggerDemoConfirmed = async () => {
    setShowDemoConfirm(false);
    setTriggering(true);
    setTriggerMsg("");
    try {
      const r = await fetch(`${API}/trigger/demo`, { method: "POST", credentials: "include" });
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

  const triggerRepo = async (repo: string) => {
    setTriggering(true);
    setTriggerMsg("");
    try {
      const r = await fetch(`${API}/trigger`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      const data = await r.json();
      setTriggerMsg(data.message ?? `Pipeline started for ${repo}`);
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
  const runningCount = runs.filter((r) => r.status === "running").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">
      {showDemoConfirm && (
        <DemoConfirmModal
          onConfirm={triggerDemoConfirmed}
          onCancel={() => setShowDemoConfirm(false)}
        />
      )}
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
            {runningCount > 0 && <span className="text-yellow-400 animate-pulse">{runningCount} running</span>}
            <span className="text-zinc-500">{runs.length} total</span>
          </div>
          <ThemeToggle />
          <button
            onClick={trigger}
            disabled={triggering}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
          >
            {triggering ? "Running..." : "▶ Trigger Demo"}
          </button>
        </div>
      </header>

      {/* Connect panel */}
      <ConnectPanel user={user} onUpdate={() => { fetchMe(); fetchRuns(); }} onTriggerRepo={triggerRepo} onTriggerDemo={trigger} />

      {triggerMsg && (
        <div className="bg-indigo-900/40 border-b border-indigo-700/50 px-6 py-2 text-sm text-indigo-300">
          {triggerMsg}
        </div>
      )}

      <div className="flex" style={{ height: "calc(100vh - 113px)" }}>
        {/* Left: Run history */}
        <div className="w-1/2 border-r border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
            Run History {user.github_login ? `— ${user.github_login}` : ""}
          </div>
          <div className="flex-1 overflow-y-auto">
            {runs.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 text-sm">
                {user.authenticated
                  ? "No runs yet. Click \"Trigger Demo\" to start."
                  : "Connect GitHub to see your runs."}
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
                    <tr key={run.id ?? i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3 max-w-45">
                        <span className="text-red-300 text-xs truncate block" title={run.error_message}>
                          {run.error_message.length > 40 ? run.error_message.slice(0, 40) + "…" : run.error_message}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{run.filename}</td>
                      <td className="px-4 py-3"><TestBadge passed={run.test_passed} /></td>
                      <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                      <td className="px-4 py-3">
                        {run.pr_url ? (
                          <a href={run.pr_url} target="_blank" rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 text-xs underline">
                            View PR ↗
                          </a>
                        ) : <span className="text-zinc-600 text-xs">—</span>}
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
          <div ref={logRef} className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed space-y-0.5">
            {logs.length === 0 ? (
              <p className="text-zinc-600">Waiting for logs...</p>
            ) : (
              logs.map((line, i) => {
                const color = line.includes("[ERROR]") ? "text-red-400"
                  : line.includes("[WARNING]") ? "text-yellow-400"
                  : line.includes("[INFO]") ? "text-zinc-300"
                  : "text-zinc-500";
                return <div key={i} className={color}>{line}</div>;
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
