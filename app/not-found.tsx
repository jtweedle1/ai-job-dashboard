"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <i className="ti ti-file-x text-gray-400 text-xl" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Page not found</h1>
        <p className="text-sm text-gray-500 mb-6">
          That page doesn&apos;t exist or was moved.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <i className="ti ti-arrow-left text-sm" aria-hidden="true" />
          Back to dashboard
        </button>
      </div>
    </main>
  );
}
