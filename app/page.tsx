"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { signInWithGoogle } from "@/lib/auth";

const features = [
  {
    icon: "ti-file-text",
    title: "Track every application",
    description: "Log jobs, update stages, and never lose track of where you stand.",
  },
  {
    icon: "ti-wand",
    title: "AI-powered extraction",
    description: "Paste a job URL or description and let AI fill in the fields for you.",
  },
  {
    icon: "ti-target",
    title: "Role-fit scoring",
    description: "Get a 0–100 fit score for every job based on your resume and goals.",
  },
  {
    icon: "ti-mail",
    title: "Cover letter generator",
    description: "Generate tailored cover letters for each job in seconds.",
  },
  {
    icon: "ti-microphone",
    title: "Interview prep",
    description: "Get mock questions and study tips generated from the job description.",
  },
  {
    icon: "ti-chart-bar",
    title: "Source analytics",
    description: "See which job sources are actually getting you responses.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  async function handleSignIn() {
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
  }

  if (loading) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gray-900 flex items-center justify-center">
            <i className="ti ti-briefcase text-emerald-400 text-sm" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-gray-900">HuntDesk</span>
        </div>
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Sign in
          <i className="ti ti-arrow-right text-sm" aria-hidden="true" />
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <i className="ti ti-sparkles text-sm" aria-hidden="true" />
          AI-powered job hunt dashboard
        </div>
        <h1 className="text-4xl font-semibold text-gray-900 leading-tight mb-4">
          Run your job search
          <br />
          like a pro
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          Track applications, generate cover letters, prep for interviews, and
          understand what's actually working — all in one place.
        </p>
        <button
          onClick={handleSignIn}
          className="inline-flex items-center gap-3 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
        <p className="text-xs text-gray-400 mt-3">Free to use. Bring your own Anthropic API key for AI features.</p>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-gray-100 rounded-xl p-5"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mb-3">
                <i className={`ti ${f.icon} text-gray-600 text-base`} aria-hidden="true" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}