"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { signInAsDemo, signInWithGoogle, signOutUser } from "@/lib/auth";
import LetterCompare from "@/components/landing/LetterCompare";
import HowItWorks from "@/components/landing/HowItWorks";
import JobJourney from "@/components/landing/JobJourney";

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

  // The two ways in, shown in the hero and again at the end of the page.
  const ctas = (align: "center" | "start") => (
    <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 ${align === "start" ? "lg:justify-start" : ""}`}>
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
  );

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
        {/* Hero: the claim on the left, the proof on the right */}
        <section className="relative max-w-6xl mx-auto px-6 pt-14 sm:pt-20 pb-16 sm:pb-20 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-12 items-center">
          <div className="absolute left-0 top-10 w-72 h-72 rounded-full sun-orb opacity-30 blur-3xl" aria-hidden="true" />
          <div className="relative text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/75 text-primary-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6 shadow-sm shadow-gray-900/5">
              <i className="ti ti-sparkles text-sm" aria-hidden="true" />
              A job search tracker with honest AI
            </div>
            <h1 className="font-display font-extrabold tracking-tight text-4xl sm:text-6xl text-gray-900 leading-[1.08] mb-5">
              Applications that sound like you, not like AI
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Wayfinder learns how you write, draws on the real stories behind your work, and checks every claim
              before you hit send. Flip the card to see the difference.
            </p>
            {ctas("start")}
            {/* Always mounted so screen readers announce the message when it appears. */}
            <div role="alert">
              {error && (
                <p className="inline-flex items-start gap-1.5 text-sm text-red-700 mt-4 max-w-md text-left">
                  <i className="ti ti-alert-circle text-base mt-px shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              The demo needs no sign-up.{" "}
              <a href="#recruiters" className="text-primary-700 hover:underline">
                Recruiter or hiring manager?
              </a>
            </p>
          </div>
          <div className="relative">
            <LetterCompare />
          </div>
        </section>

        <HowItWorks />
        <JobJourney />

        {/* Closing: try it, plus how to get AI features */}
        <section aria-labelledby="closing-heading" className="max-w-4xl mx-auto px-6 pb-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-peach-200 via-rose-200 to-primary-200 px-6 py-12 sm:px-12 text-center shadow-sm shadow-gray-900/5">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full sun-orb opacity-60 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <h2 id="closing-heading" className="font-display font-extrabold tracking-tight text-2xl sm:text-3xl text-gray-900 mb-3">
                Look around Riley&apos;s job search
              </h2>
              <p className="text-gray-700 mb-7 max-w-lg mx-auto">
                The demo is a full sample search: eight jobs, two letters, prep, a debrief, and a weekly review. No
                sign-up needed.
              </p>
              {ctas("center")}
              {/* The hero's alert already announces it; this copy is for sighted visitors down here. */}
              {error && (
                <p aria-hidden="true" className="inline-flex items-start gap-1.5 text-sm text-red-700 mt-4 max-w-md text-left">
                  <i className="ti ti-alert-circle text-base mt-px shrink-0" />
                  {error}
                </p>
              )}
              <p className="text-xs text-gray-700 mt-5">
                Your own account is free. Bring your own Anthropic API key for AI features; it&apos;s stored encrypted
                and never sent back to your browser.
              </p>
              <p id="recruiters" className="text-xs text-gray-700 mt-2 scroll-mt-24">
                Recruiter or hiring manager? Jazmin is happy to provide a temporary API key so you can explore every
                feature.{" "}
                <a href="mailto:jazminrtweedle@gmail.com" className="font-medium text-primary-800 hover:underline">
                  jazminrtweedle@gmail.com
                </a>
              </p>
            </div>
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
