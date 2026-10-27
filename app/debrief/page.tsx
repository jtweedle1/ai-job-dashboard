"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StoryTabs from "@/components/StoryTabs";
import DebriefPanel from "@/components/job/DebriefPanel";

// Interview notes across every job. Logging happens inside the job, so an old ?jobId= link goes there.
function DebriefContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId");

  useEffect(() => {
    if (jobId) router.replace(`/applications/${jobId}?step=debrief`);
  }, [jobId, router]);

  if (jobId) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <StoryTabs />
      <div className="mb-6">
        <h1 className="page-title">Interview notes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          What you learned in each interview. Log a new one from the job&apos;s Debrief step.
        </p>
      </div>
      <DebriefPanel />
    </div>
  );
}

export default function DebriefPage() {
  return (
    <Suspense>
      <DebriefContent />
    </Suspense>
  );
}
