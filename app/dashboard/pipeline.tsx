"use client";

import { useEffect, useState } from "react";

// ── Event model (mirrors agent/events.py + orchestrator) ─────────────────────

export interface DevloopEvent {
  type: string;
  run: string;
  ts: number;
  [key: string]: unknown;
}

export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped" | "warning" | "retrying";

export interface StepState {
  status: StepStatus;
  detail?: string;
  url?: string;
  attempt?: number;
}

export interface TestResult {
  phase: "red" | "green";
  attempt: number;
  passed: boolean;
  exit_code: number | null;
  output: string;
  backend?: string;
  url?: string | null;
  duration?: number | null;
}

export interface Attempt {
  n: number;
  diff?: string;
  summary?: string;
  linesChanged?: number;
  test?: TestResult;
}

export interface RunDone {
  status: "success" | "failed";
  pr_url?: string;
  draft?: boolean;
  duration?: number;
  tokens?: number;
  llm_calls?: number;
  attempts?: number;
  reproduced?: boolean | null;
  lines_changed?: number;
  file_lines?: number;
  reason?: string;
  failed_step?: string;
}

export interface LiveRun {
  key: string;
  error?: string;
  filename?: string;
  repo?: string;
  base?: string;
  incident?: boolean;
  scenarioTitle?: string;
  startedAt: number;
  incidentAt?: number;
  endedAt?: number;
  steps: Record<string, StepState>;
  analysis?: { root_cause: string; buggy_line: string; fix_strategy: string };
  attempts: Attempt[];
  red?: TestResult;
  done?: RunDone;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const isoMs = (v: unknown): number | undefined => {
  const s = str(v);
  return s ? new Date(s).getTime() : undefined;
};

function upsertAttempt(attempts: Attempt[], n: number, patch: Partial<Attempt>): Attempt[] {
  const found = attempts.some((a) => a.n === n);
  const next = found ? attempts.map((a) => (a.n === n ? { ...a, ...patch } : a)) : [...attempts, { n, ...patch }];
  return next.sort((a, b) => a.n - b.n);
}

export function applyEvent(runs: Record<string, LiveRun>, ev: DevloopEvent): Record<string, LiveRun> {
  const prev: LiveRun = runs[ev.run] ?? { key: ev.run, startedAt: ev.ts * 1000, steps: {}, attempts: [] };
  const run: LiveRun = { ...prev, steps: { ...prev.steps } };

  switch (ev.type) {
    case "run":
      run.error = str(ev.error) ?? run.error;
      run.filename = str(ev.filename) ?? run.filename;
      run.repo = str(ev.repo) ?? run.repo;
      run.base = str(ev.base) ?? run.base;
      run.incident = run.incident || ev.incident === true;
      run.scenarioTitle = str(ev.scenario_title) ?? run.scenarioTitle;
      run.incidentAt = run.incidentAt ?? isoMs(ev.incident_at);
      run.startedAt = Math.min(run.startedAt, isoMs(ev.started_at) ?? run.startedAt);
      break;
    case "step": {
      const step = str(ev.step);
      if (step) {
        run.steps[step] = {
          status: (str(ev.status) as StepStatus) ?? "running",
          detail: str(ev.detail) ?? (ev.status === "running" ? run.steps[step]?.detail : undefined),
          url: str(ev.url) ?? run.steps[step]?.url,
          attempt: num(ev.attempt) ?? run.steps[step]?.attempt,
        };
      }
      break;
    }
    case "analysis":
      run.analysis = {
        root_cause: str(ev.root_cause) ?? "",
        buggy_line: str(ev.buggy_line) ?? "",
        fix_strategy: str(ev.fix_strategy) ?? "",
      };
      break;
    case "patch":
      run.attempts = upsertAttempt(run.attempts, num(ev.attempt) ?? 1, {
        diff: str(ev.diff), summary: str(ev.summary), linesChanged: num(ev.lines_changed),
      });
      break;
    case "test": {
      const result: TestResult = {
        phase: ev.phase === "red" ? "red" : "green",
        attempt: num(ev.attempt) ?? 1,
        passed: ev.passed === true,
        exit_code: num(ev.exit_code) ?? null,
        output: str(ev.output) ?? "",
        backend: str(ev.backend),
        url: str(ev.url) ?? null,
        duration: num(ev.duration) ?? null,
      };
      if (result.phase === "red") run.red = result;
      else run.attempts = upsertAttempt(run.attempts, result.attempt, { test: result });
      break;
    }
    case "done":
      run.done = ev as unknown as RunDone;
      run.endedAt = ev.ts * 1000;
      break;
  }
  return { ...runs, [ev.run]: run };
}

export function runFromEvents(events: DevloopEvent[]): LiveRun | null {
  if (!events.length) return null;
  const runs = events.reduce(applyEvent, {} as Record<string, LiveRun>);
  return runs[events[0].run] ?? null;
}

// ── UI ────────────────────────────────────────────────────────────────────────

const STEPS: { key: string; label: string; icon: string; incidentOnly?: boolean }[] = [
  { key: "deploy", label: "Bad deploy", icon: "💥", incidentOnly: true },
  { key: "alert", label: "Sentry alert", icon: "🚨", incidentOnly: true },
  { key: "fetch", label: "Fetch code", icon: "📥" },
  { key: "analyze", label: "Root cause", icon: "🧠" },
  { key: "fix", label: "Patch + test", icon: "🛠" },
  { key: "reproduce", label: "Reproduce", icon: "🔴" },
  { key: "verify", label: "Verify", icon: "🟢" },
  { key: "pr", label: "Open PR", icon: "🔀" },
  { key: "notify", label: "Slack", icon: "📣" },
];

const STATUS_STYLE: Record<StepStatus, string> = {
  pending: "border-zinc-800 text-zinc-600",
  running: "border-indigo-500 text-indigo-200 bg-indigo-500/10 animate-pulse",
  retrying: "border-amber-500 text-amber-200 bg-amber-500/10 animate-pulse",
  done: "border-emerald-600/60 text-emerald-300 bg-emerald-500/10",
  failed: "border-red-600/60 text-red-300 bg-red-500/10",
  warning: "border-amber-600/60 text-amber-300 bg-amber-500/10",
  skipped: "border-zinc-800 text-zinc-500 line-through",
};

const STATUS_MARK: Record<StepStatus, string> = {
  pending: "○", running: "◌", retrying: "↻", done: "✓", failed: "✗", warning: "!", skipped: "–",
};

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function fmtSeconds(ms: number) {
  const s = Math.max(0, ms / 1000);
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
}

function Timeline({ run }: { run: LiveRun }) {
  const steps = STEPS.filter((s) => !s.incidentOnly || run.incident);
  return (
    <div className="flex flex-wrap items-stretch gap-1.5">
      {steps.map((s, i) => {
        const st = run.steps[s.key];
        const status: StepStatus = st?.status ?? "pending";
        const attempt = st?.attempt && st.attempt > 1 ? ` #${st.attempt}` : "";
        const body = (
          <div className={`border rounded-md px-2 py-1.5 min-w-[92px] transition-colors ${STATUS_STYLE[status]}`}
            title={st?.detail ?? ""}>
            <div className="flex items-center gap-1 text-xs font-semibold">
              <span>{s.icon}</span><span>{s.label}{attempt}</span>
              <span className="ml-auto opacity-80">{STATUS_MARK[status]}</span>
            </div>
            {st?.detail && <div className="text-[10px] opacity-70 truncate max-w-[140px]">{st.detail}</div>}
          </div>
        );
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            {st?.url
              ? <a href={st.url} target="_blank" rel="noopener noreferrer" className="hover:brightness-125">{body}</a>
              : body}
            {i < steps.length - 1 && <span className="text-zinc-700 text-xs">→</span>}
          </div>
        );
      })}
    </div>
  );
}

function DiffView({ diff }: { diff: string }) {
  return (
    <pre className="text-[11px] leading-snug bg-zinc-950 border border-zinc-800 rounded-md p-2 overflow-x-auto max-h-72">
      {diff.split("\n").map((line, i) => {
        const cls = line.startsWith("+++") || line.startsWith("---") ? "text-zinc-500 font-semibold"
          : line.startsWith("@@") ? "text-cyan-400"
          : line.startsWith("+") ? "text-emerald-300 bg-emerald-500/10"
          : line.startsWith("-") ? "text-red-300 bg-red-500/10"
          : "text-zinc-400";
        return <div key={i} className={cls}>{line || " "}</div>;
      })}
    </pre>
  );
}

function TestCard({ title, result, expectFail }: { title: string; result?: TestResult; expectFail?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!result) return null;
  const good = expectFail ? result.exit_code === 1 : result.passed;
  const verdict = expectFail
    ? (good ? "❌ fails on buggy code — bug reproduced" : `⚠️ did not reproduce (exit ${result.exit_code ?? "?"})`)
    : (good ? "✅ all tests pass" : `❌ failing (exit ${result.exit_code ?? "?"})`);
  return (
    <div className={`border rounded-md p-2 ${good ? "border-emerald-700/50" : "border-red-700/50"}`}>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400">{title}</span>
        <span className={good ? "text-emerald-300" : "text-red-300"}>{verdict}</span>
        {result.url && <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">run ↗</a>}
        <button onClick={() => setOpen(!open)} className="ml-auto text-zinc-500 hover:text-zinc-300">{open ? "hide" : "output"}</button>
      </div>
      {open && <pre className="mt-2 text-[10px] text-zinc-400 bg-zinc-950 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">{result.output || "(no output)"}</pre>}
    </div>
  );
}

export function PipelineView({ run }: { run: LiveRun }) {
  const live = !run.done;
  const now = useNow(live);
  const t0 = run.incidentAt ?? run.startedAt;
  const elapsed = (run.endedAt ?? now) - t0;
  const [shownAttempt, setShownAttempt] = useState<number | null>(null);
  const latest = run.attempts[run.attempts.length - 1];
  const attempt = run.attempts.find((a) => a.n === shownAttempt) ?? latest;
  const done = run.done;

  return (
    <div className="p-4 space-y-3 border-b border-zinc-800 bg-zinc-900/30">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-zinc-500">
            {run.incident ? `💥 Incident${run.scenarioTitle ? ` · ${run.scenarioTitle}` : ""}` : "Run"}
            {run.repo && <> · <span className="text-zinc-400">{run.repo}</span>{run.base && <span className="text-zinc-600">@{run.base}</span>}</>}
          </div>
          <div className="text-sm text-red-300 truncate" title={run.error}>{run.error ?? "Waiting for alert…"}</div>
          {run.filename && <div className="text-[11px] text-zinc-500 truncate">{run.filename}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold tabular-nums ${live ? "text-indigo-300" : done?.status === "success" ? "text-emerald-300" : "text-red-300"}`}>
            {fmtSeconds(elapsed)}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
            {live ? (run.incident ? "since bad deploy" : "elapsed") : done?.pr_url ? "crash → PR" : "total"}
          </div>
        </div>
      </div>

      <Timeline run={run} />

      {/* Attempts strip */}
      {run.attempts.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {run.attempts.map((a, i) => {
            const mark = a.test ? (a.test.passed ? "✅" : "❌") : (live && a === latest ? "⏳" : "·");
            return (
              <span key={a.n} className="flex items-center gap-1.5">
                <button onClick={() => setShownAttempt(a.n)}
                  className={`px-2 py-0.5 rounded border ${attempt?.n === a.n ? "border-indigo-500 text-indigo-200" : "border-zinc-700 text-zinc-400"} hover:border-indigo-400`}>
                  Attempt {a.n} {mark}
                </button>
                {i < run.attempts.length - 1 && <span className="text-zinc-600">→</span>}
              </span>
            );
          })}
          {run.attempts.length > 1 && <span className="text-amber-300/80 ml-1">self-healed from test feedback</span>}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {/* Root cause */}
        {run.analysis && (
          <div className="border border-zinc-800 rounded-md p-3 space-y-1.5 text-xs">
            <div className="text-zinc-500 uppercase tracking-wider text-[10px]">Root cause</div>
            <p className="text-zinc-200">{run.analysis.root_cause}</p>
            {run.analysis.buggy_line && (
              <code className="block bg-red-500/10 text-red-300 px-2 py-1 rounded truncate" title={run.analysis.buggy_line}>
                {run.analysis.buggy_line}
              </code>
            )}
            <p className="text-zinc-400"><span className="text-zinc-500">Fix:</span> {run.analysis.fix_strategy}</p>
          </div>
        )}

        {/* Evidence */}
        {(run.red || attempt?.test) && (
          <div className="space-y-2">
            <TestCard title="Regression test on original code" result={run.red} expectFail />
            <TestCard title={`Test suite with fix (attempt ${attempt?.n ?? 1})`} result={attempt?.test} />
          </div>
        )}
      </div>

      {/* Diff */}
      {attempt?.diff && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
            <span>Patch · attempt {attempt.n}</span>
            {attempt.linesChanged !== undefined && <span className="normal-case tracking-normal text-zinc-400">{attempt.linesChanged} line(s) changed</span>}
          </div>
          {attempt.summary && <p className="text-xs text-zinc-300">{attempt.summary}</p>}
          <DiffView diff={attempt.diff} />
        </div>
      )}

      {/* Outcome */}
      {done && (
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {done.pr_url
            ? <a href={done.pr_url} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                {done.draft ? "View draft PR ↗" : "View PR ↗"}
              </a>
            : <span className="text-red-300">Stopped at {done.failed_step ?? "?"}: {done.reason}</span>}
          {done.tokens !== undefined && (
            <span className="text-zinc-400" title="LLM tokens for the whole run">
              🪙 {done.tokens.toLocaleString()} tokens · {done.llm_calls ?? 0} LLM calls
            </span>
          )}
          {done.lines_changed !== undefined && done.file_lines !== undefined && (
            <span className="text-zinc-500" title="The fixer returns search/replace edits, not the whole file">
              edit-only patch: {done.lines_changed} of {done.file_lines} lines
            </span>
          )}
        </div>
      )}
    </div>
  );
}
