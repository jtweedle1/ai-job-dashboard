"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StoryTabs from "@/components/StoryTabs";
import DebriefPanel from "@/components/job/DebriefPanel";
import PageFrame from "@/components/ui/PageFrame";

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
    <PageFrame
      above={<StoryTabs />}
      title="Interview notes"
      intro="What you learned in each interview. Log a new one from the job's Interview notes step."
    >
      <DebriefPanel />
    </PageFrame>
  );
}

export default function DebriefPage() {
  return (
    <Suspense>
      <DebriefContent />
    </Suspense>
  );
}
