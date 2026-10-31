"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { signInAsDemo, signInWithGoogle, signOutUser } from "@/lib/auth";
import LetterCompare from "@/components/landing/LetterCompare";
import HowItWorks from "@/components/landing/HowItWorks";
import JobJourney from "@/components/landing/JobJourney";
import Button from "@/components/ui/Button";
import { ContourMap } from "@/components/illustrations";
import { Logo } from "@/components/Sidebar";

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
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 ${align === "start" ? "lg:justify-start" : ""}`}>
      <Button variant="primary" size="lg" onClick={handleDemo} disabled={signingIn} loading={startingDemo} loadingLabel="Setting up the demo…">
        Try the demo
      </Button>
      <Button size="lg" onClick={handleSignIn} disabled={startingDemo} loading={signingIn} loadingLabel="Signing in…" className="gap-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </Button>
    </div>
  );

  // Render the page right away (and on the server) instead of waiting for auth; only a signed-in
  // visitor, who is about to be redirected, gets nothing.
  if (user && !startingDemo) return null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-5">
        <Logo />
        <nav aria-label="Get started" className="flex items-center gap-1">
          <Button variant="quiet" onClick={handleDemo} disabled={startingDemo || signingIn} className="max-sm:hidden">
            Try the demo
          </Button>
          <Button variant="quiet" onClick={handleSignIn} disabled={signingIn || startingDemo}>
            Sign in
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </Button>
        </nav>
      </header>

      <main>
        {/* Hero: the claim on the left, the proof on the right */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="font-serif text-[2.5rem] leading-[1.1] sm:text-display-xl font-semibold text-ink text-balance">
              Applications that sound like you, not like AI
            </h1>
            <p className="mt-5 mb-8 text-reading text-ink-soft max-w-xl mx-auto lg:mx-0 text-pretty">
              Wayfinder learns how you write, draws on the real stories behind your work, and checks every claim
              before you hit send. Flip the card to see the difference.
            </p>
            {ctas("start")}
            {/* Always mounted so screen readers announce the message when it appears. */}
            <div role="alert">
              {error && (
                <p className="inline-flex items-start gap-1.5 text-meta text-danger mt-4 max-w-md text-left">
                  <i className="ti ti-alert-circle text-base shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
            </div>
            <p className="text-meta text-ink-soft mt-4">
              The demo needs no sign-up.{" "}
              <a href="#recruiters" className="font-semibold text-action hover:underline underline-offset-4">
                Recruiter or hiring manager?
              </a>
            </p>
          </div>
          <LetterCompare />
        </section>

        <HowItWorks />
        <JobJourney />

        {/* Closing: try it, plus how to get AI features */}
        <section aria-labelledby="closing-heading" className="max-w-2xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
          <ContourMap width={120} className="mx-auto mb-6 text-ink-soft" />
          <h2 id="closing-heading" className="font-serif text-title font-semibold text-ink">
            Look around Riley&apos;s job search
          </h2>
          <p className="mt-2 mb-8 text-ink-soft max-w-lg mx-auto text-pretty">
            The demo is a full sample search: eight jobs, two letters, prep, a debrief, and a weekly review. No
            sign-up needed.
          </p>
          {ctas("center")}
          {/* The hero's alert already announces it; this copy is for sighted visitors down here. */}
          {error && (
            <p aria-hidden="true" className="inline-flex items-start gap-1.5 text-meta text-danger mt-4 max-w-md text-left">
              <i className="ti ti-alert-circle text-base shrink-0" />
              {error}
            </p>
          )}
          <p className="text-meta text-ink-soft mt-8 text-pretty">
            Your own account is free. Bring your own Anthropic API key for AI features; it&apos;s stored encrypted
            and never sent back to your browser.
          </p>
          <p id="recruiters" className="text-meta text-ink-soft mt-2 scroll-mt-24 text-pretty">
            Recruiter or hiring manager? Jazmin is happy to provide a temporary API key so you can explore every
            feature.{" "}
            <a href="mailto:jazminrtweedle@gmail.com" className="font-semibold text-action hover:underline underline-offset-4">
              jazminrtweedle@gmail.com
            </a>
          </p>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo small />
          <ul aria-label="Built with" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-meta text-ink-muted">
            {stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
