"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const STEPS = [
  {
    icon: "🚨",
    title: "Sentry detects a crash",
    desc: "Your app throws an exception in production. Sentry captures it and fires a webhook to DevLoop instantly.",
  },
  {
    icon: "🧠",
    title: "Two-LLM pipeline diagnoses the bug",
    desc: "A fast analyzer LLM reads the error and stack trace to pinpoint the root cause. A code-focused fixer LLM then reads only the broken file and the analysis — writing a minimal, surgical patch.",
  },
  {
    icon: "🧪",
    title: "Patch is tested in a sandbox",
    desc: "The fix runs in an isolated Docker container against your test suite before touching your repo.",
  },
  {
    icon: "🔀",
    title: "Pull request opened automatically",
    desc: "DevLoop commits the fix to a new branch and opens a PR on your GitHub repo — with root cause, fix summary, and test results in the description.",
  },
  {
    icon: "📣",
    title: "Slack notification sent",
    desc: "Your team gets a Slack message with the error, fix summary, and a direct link to the PR. You review and merge.",
  },
];

const FEATURES = [
  { icon: "⚡", label: "Fixes in minutes", sub: "not hours on-call" },
  { icon: "🔐", label: "OAuth — no tokens pasted", sub: "GitHub + Slack OAuth" },
  { icon: "👥", label: "Multi-user, isolated", sub: "each user sees only their runs" },
  { icon: "📡", label: "Live log stream", sub: "watch the agent work in real time" },
  { icon: "🏪", label: "Multi-repo support", sub: "connect as many repos as you need" },
  { icon: "🧪", label: "Sandboxed testing", sub: "never pushes untested code" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔧</span>
          <span className="font-bold text-white text-lg">DevLoop</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded transition-colors"
          >
            Open Dashboard →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-900/40 border border-indigo-700/50 rounded-full text-indigo-300 text-xs mb-2">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
          AI-powered production incident resolution
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight max-w-3xl">
          Sentry fires.<br />
          <span className="text-indigo-400">DevLoop fixes.</span>
        </h1>

        <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
          DevLoop watches your production errors, diagnoses the root cause with a two-LLM pipeline, and opens a pull request with a tested fix — while you sleep.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Try it yourself →
          </Link>
          <a
            href="https://github.com/rishikesh183/devloop-demo-app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors border border-zinc-700"
          >
            View demo repo ↗
          </a>
        </div>

        <p className="text-zinc-600 text-xs mt-2">
          No prod bugs? Hit &ldquo;Trigger Demo&rdquo; in the dashboard &mdash; we keep a live buggy repo for exactly this.
        </p>
      </section>

      {/* Demo video */}
      <section className="max-w-4xl mx-auto w-full px-6 pb-16">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-6 text-center">See it in action</h2>
        <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
          <video
            src="/demo_recording.mp4"
            controls
            playsInline
            className="w-full"
            poster=""
          />
        </div>
        <p className="text-zinc-600 text-xs text-center mt-3">Full demo: error detected → patch written → PR opened in ~45 seconds</p>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto w-full px-6 pb-20">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-8 text-center">How it works</h2>

        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-zinc-800" />

          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-6 relative pl-14">
                {/* circle on line */}
                <div className="absolute left-0 top-4 w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-full text-xl z-10">
                  {step.icon}
                </div>
                <div className="pb-10 pt-3">
                  <p className="text-white font-semibold text-sm mb-1">{step.title}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-zinc-800 bg-zinc-900/30 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-8 text-center">Built for real teams</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-1">
                <span className="text-2xl">{f.icon}</span>
                <span className="text-white text-sm font-semibold">{f.label}</span>
                <span className="text-zinc-500 text-xs">{f.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-20 gap-4">
        <h2 className="text-2xl font-bold text-white">Ready to close that incident tab?</h2>
        <p className="text-zinc-400 text-sm max-w-md">
          Connect your GitHub and Slack, add a repo, and let DevLoop handle the next 3am crash.
        </p>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors mt-2"
        >
          Open Dashboard →
        </Link>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-zinc-600 text-xs">
        DevLoop — built for the hackathon, designed for production
      </footer>
    </div>
  );
}
