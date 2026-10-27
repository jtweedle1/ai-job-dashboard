"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { signInAsDemo, signInWithGoogle, signOutUser } from "@/lib/auth";
import { DEMO_LETTERS } from "@/lib/demo-data";
import { HighlightedLetter } from "@/components/LetterReview";

const differentiators = [
  {
    icon: "ti-feather",
    title: "Written in your voice",
    description:
      "Add a few things you've written. Wayfinder measures how you actually write (length, rhythm, contractions, sign-offs) and drafts letters that sound like you.",
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

// Closing or replacing the Google popup is the visitor's choice, not an error.
const QUIET_SIGN_IN_ERRORS = ["auth/popup-closed-by-user", "auth/cancelled-popup-request"];

function signInErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string })?.code ?? "";
  if (QUIET_SIGN_IN_ERRORS.includes(code)) return null;
  if (code === "auth/popup-blocked") {
    return "Your browser blocked the Google sign-in window. Allow pop-ups for this site, then try again.";
  }
  if (code === "auth/network-request-failed") {
    return "Couldn't reach Google. Check your connection and try again.";
  }
  return "Sign-in didn't work. Try again, or try the demo instead.";
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [startingDemo, setStartingDemo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // While the demo is being seeded, wait so the dashboard doesn't load empty.
    if (!loading && user && !startingDemo) {
      router.replace("/dashboard");
    }
  }, [user, loading, router, startingDemo]);

  async function handleDemo() {
    if (startingDemo || signingIn) return;
    setStartingDemo(true);
    setError("");
    try {
      await signInAsDemo();
      router.push("/dashboard");
    } catch (err) {
      console.error("Demo sign-in failed:", err);
      // If the account was created but seeding failed, sign it out so the visitor stays here
      // and sees the error instead of being redirected to an empty dashboard.
      await signOutUser().catch(() => {});
      setError("The demo couldn't start. Try again, or sign in with Google.");
      setStartingDemo(false);
    }
  }

  async function handleSignIn() {
    if (signingIn || startingDemo) return;
    setSigningIn(true);
    setError("");
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      console.error("Sign-in failed:", err);
      setError(signInErrorMessage(err) ?? "");
      setSigningIn(false);
    }
  }

  // Render the page right away (and on the server) instead of waiting for auth; only a signed-in
  // visitor, who is about to be redirected, gets nothing.
  if (user && !startingDemo) return null;

  return (
    <div className="min-h-screen sunrise text-gray-900">
      <header className="flex items-center justify-between px-6 sm:px-8 py-4 bg-white/40 backdrop-blur-xl border-b border-white/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full sun-orb shadow-sm shadow-peach-400/40" aria-hidden="true" />
          <span className="text-lg font-display font-extrabold tracking-tight text-gray-900">Wayfinder</span>
        </div>
        <nav aria-label="Get started" className="flex items-center gap-4">
          <button
            onClick={handleDemo}
            disabled={startingDemo || signingIn}
            className="text-sm font-medium text-primary-700 hover:text-primary-500 transition-colors disabled:opacity-50"
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
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative max-w-3xl mx-auto px-6 pt-20 pb-14 text-center">
          <div className="absolute left-1/2 -translate-x-1/2 top-6 w-72 h-72 rounded-full sun-orb opacity-30 blur-3xl -z-0" aria-hidden="true" />
          <div className="relative inline-flex items-center gap-2 bg-white/75 text-primary-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6 shadow-sm shadow-gray-900/5">
            <i className="ti ti-sparkles text-sm" aria-hidden="true" />
            A job search tracker with honest AI
          </div>
          <h1 className="relative font-display font-extrabold tracking-tight text-4xl sm:text-6xl text-gray-900 leading-[1.08] mb-5">
            Applications that sound
            <br />
            like you, not like AI
          </h1>
          <p className="relative text-lg text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
            Wayfinder learns how you write, draws on the real stories behind your work, and checks every claim
            before you hit send. Plus a tracker that shows what&apos;s actually working.
          </p>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleDemo}
              disabled={startingDemo || signingIn}
              className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-6 py-3 rounded-full shadow-lg shadow-primary-600/25 hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <i className={`ti ${startingDemo ? "ti-loader-2 animate-spin" : "ti-player-play"} text-sm`} aria-hidden="true" />
              {startingDemo ? "Setting up the demo…" : "Try the demo"}
            </button>
            <button
              onClick={handleSignIn}
              disabled={signingIn || startingDemo}
              className="inline-flex items-center gap-3 bg-white/85 text-gray-800 text-sm font-medium px-6 py-3 rounded-full shadow-sm shadow-gray-900/5 hover:bg-white transition-colors disabled:opacity-50"
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
          {/* Always mounted so screen readers announce the message when it appears. */}
          <div role="alert" className="relative">
            {error && (
              <p className="inline-flex items-start gap-1.5 text-sm text-red-700 mt-4 max-w-md text-left">
                <i className="ti ti-alert-circle text-base mt-px shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
          </div>
          <p className="relative text-xs text-gray-500 mt-4">
            The demo needs no sign-up. Your own account is free; bring your own Anthropic API key for AI features.
          </p>
          <p className="relative text-xs text-gray-500 mt-2">
            Recruiter or hiring manager? Jazmin is happy to provide a temporary API key so you can explore every
            feature.{" "}
            <a href="mailto:jazminrtweedle@gmail.com" className="text-primary-700 hover:underline">
              jazminrtweedle@gmail.com
            </a>
          </p>
        </section>

        {/* What makes it different */}
        <section aria-labelledby="different-heading" className="max-w-4xl mx-auto px-6 pb-14">
          <h2 id="different-heading" className="sr-only">What makes Wayfinder different</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {differentiators.map((f) => (
              <div key={f.title} className="bg-white/75 backdrop-blur border border-white rounded-3xl p-6 shadow-sm shadow-gray-900/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-peach-200 via-rose-200 to-primary-200 flex items-center justify-center mb-4">
                  <i className={`ti ${f.icon} text-gray-800 text-lg`} aria-hidden="true" />
                </div>
                <h3 className="font-display font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Claim tracing preview */}
        <section aria-labelledby="preview-heading" className="max-w-3xl mx-auto px-6 pb-16">
          <div className="bg-white/80 backdrop-blur border border-white rounded-3xl overflow-hidden shadow-sm shadow-gray-900/5">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <h2 id="preview-heading" className="font-display font-bold text-sm text-gray-700">From a demo cover letter</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary-100 border border-primary-500" />
                  Backed by their notes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-500" />
                  Not found, check it
                </span>
              </div>
            </div>
            <div className="px-6 py-5">
              <HighlightedLetter content={previewText} claims={preview.claims} lightOnly />
              <p className="relative text-xs text-gray-500 mt-4">
                Hover a highlight to see the exact line it came from. The workshop claim isn&apos;t in Riley&apos;s
                notes, so it&apos;s flagged before the letter goes out.
              </p>
            </div>
          </div>
        </section>

        {/* Everything else */}
        <section aria-labelledby="rest-heading" className="max-w-4xl mx-auto px-6 pb-20">
          <h2 id="rest-heading" className="font-display font-bold text-lg text-gray-900 text-center mb-5">And the rest of your search, in one place</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3 bg-white/70 backdrop-blur border border-white rounded-3xl p-4">
                <i className={`ti ${f.icon} text-primary-500 text-base mt-0.5`} aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/70 bg-white/40 backdrop-blur px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full sun-orb" aria-hidden="true" />
            <span className="font-display font-extrabold text-gray-900">Wayfinder</span>
          </div>
          <ul aria-label="Built with" className="flex flex-wrap items-center justify-center gap-2">
            {stack.map((s) => (
              <li
                key={s}
                className="text-xs text-gray-500 bg-white/70 border border-white px-2.5 py-1 rounded-full"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
