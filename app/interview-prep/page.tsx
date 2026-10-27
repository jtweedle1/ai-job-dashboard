"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// This now lives inside each job, so old links land on the right step.
function Redirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const jobId = searchParams.get("jobId");
    router.replace(jobId ? `/applications/${jobId}?step=interview` : "/applications");
  }, [searchParams, router]);

  return null;
}

export default function InterviewPrepPage() {
  return (
    <Suspense>
      <Redirect />
    </Suspense>
  );
}
