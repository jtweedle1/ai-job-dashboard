"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { signInAsDemo, signInWithGoogle } from "@/lib/auth";
import { DEMO_LETTERS } from "@/lib/demo-data";
import { HighlightedLetter } from "@/components/LetterReview";

const differentiators = [
  {
    icon: "ti-feather",
    title: "Written in your voice",
    description:
      "Add a few things you've written. HuntDesk measures how you actually write (length, rhythm, contractions, sign-offs) and drafts letters that sound like you.",
  },
  {
    icon: "ti-books",
    title: "Built from your real stories",
    description:
      "Write up the stories behind each job once. Cover letters and application answers draw from them instead of rewording your resume.",
  },
  {
    icon: "ti-shield-check",
    title: "Every claim traced",
    description:
      "Each letter is fact-checked against your own material. Anything you never said gets flagged, and your banned words are enforced in code, not just requested.",
  },
];

const features = [
  { icon: "ti-file-text", title: "Application tracker", description: "Stages, sources, and notes for every job." },
  { icon: "ti-target", title: "Role-fit scoring", description: "A 0–100 score against your resume and goals." },
  { icon: "ti-microphone", title: "Interview prep", description: "Questions and study tips for the actual role." },
  { icon: "ti-building", title: "Company research", description: "One click to fill in what they do and who they compete with." },
  { icon: "ti-chart-bar", title: "Source analytics", description: "See which job sources actually get responses." },
  { icon: "ti-calendar-week", title: "Weekly review", description: "A short look back and a plan for next week." },
];

// A real excerpt from the demo, so the preview matches what visitors see inside.
const preview = DEMO_LETTERS[1];
const previewText = preview.content.split("\n\n")[2];

const stack = ["Next.js 16", "TypeScript", "Firebase", "Tailwind CSS", "Anthropic API", "Vercel"];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [startingDemo, setStartingDemo] = useState(false);
  const [demoError, setDemoError] = useState("");

  useEffect(() => {
    // While the demo is being seeded, wait so the dashboard doesn't load empty.
    if (!loading && user && !startingDemo) {
      router.replace("/dashboard");
    }
  }, [user, loading, router, startingDemo]);

  async function handleDemo() {
    if (startingDemo || signingIn) return;
    setStartingDemo(true);
    setDemoError("");
    try {
      await signInAsDemo();
      router.push("/dashboard");
    } catch (err) {
      console.error("Demo sign-in failed:", err);
      setDemoError("The demo couldn't start. Try again, or sign in with Google.");
      setStartingDemo(false);
    }
  }

  async function handleSignIn() {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      console.error("Sign-in failed:", err);
      setSigningIn(false);
    }
  }

  if (loading) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gray-900 flex items-center justify-center">
            <i className="ti ti-briefcase text-emerald-400 text-sm" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-gray-900">HuntDesk</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDemo}
            disabled={startingDemo || signingIn}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-500 transition-colors disabled:opacity-50"
          >
            Try the demo
          </button>
          <button
            onClick={handleSignIn}
            disabled={signingIn || startingDemo}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            Sign in
            <i className="ti ti-arrow-right text-sm" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-14 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <i className="ti ti-sparkles text-sm" aria-hidden="true" />
          A job search tracker with honest AI
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 leading-tight mb-4">
          Applications that sound
          <br />
          like you, not like AI
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed">
          HuntDesk learns how you write, draws on the real stories behind your work, and checks every claim
          before you hit send. Plus a tracker that shows what&apos;s actually working.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleDemo}
            disabled={startingDemo || signingIn}
            className="inline-flex items-center gap-2 bg-emerald-500 text-white text-sm font-medium px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <i className={`ti ${startingDemo ? "ti-loader-2 animate-spin" : "ti-player-play"} text-sm`} aria-hidden="true" />
            {startingDemo ? "Setting up the demo…" : "Try the demo"}
          </button>
          <button
            onClick={handleSignIn}
            disabled={signingIn || startingDemo}
            className="inline-flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {signingIn ? (
              <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {signingIn ? "Signing in…" : "Continue with Google"}
          </button>
        </div>
        {demoError && <p className="text-xs text-red-500 mt-3">{demoError}</p>}
        <p className="text-xs text-gray-400 mt-3">
          The demo needs no sign-up. Your own account is free; bring your own Anthropic API key for AI features.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Recruiter or hiring manager? Jazmin is happy to provide a temporary API key so you can explore every
          feature.{" "}
          <a href="mailto:jazminrtweedle@gmail.com" className="text-emerald-700 hover:underline">
            jazminrtweedle@gmail.com
          </a>
        </p>
      </section>

      {/* What makes it different */}
      <section className="max-w-4xl mx-auto px-6 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {differentiators.map((f) => (
            <div key={f.title} className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                <i className={`ti ${f.icon} text-emerald-700 text-base`} aria-hidden="true" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Claim tracing preview */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">From a demo cover letter</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-500" />
                Backed by their notes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-500" />
                Not found, check it
              </span>
            </div>
          </div>
          <div className="px-5 py-4">
            <HighlightedLetter content={previewText} claims={preview.claims} lightOnly />
            <p className="text-xs text-gray-400 mt-3">
              Hover a highlight to see the exact line it came from. The workshop claim isn&apos;t in Riley&apos;s
              notes, so it&apos;s flagged before the letter goes out.
            </p>
          </div>
        </div>
      </section>

      {/* Everything else */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-medium text-gray-900 text-center mb-4">And the rest of your search, in one place</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-4">
              <i className={`ti ${f.icon} text-gray-400 text-base mt-0.5`} aria-hidden="true" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gray-900 flex items-center justify-center">
              <i className="ti ti-briefcase text-emerald-400 text-xs" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-gray-900">HuntDesk</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {stack.map((s) => (
              <span
                key={s}
                className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
