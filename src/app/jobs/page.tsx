import { Suspense } from "react";
import { JobsPage } from "@/components/jobs";
export default function Page() {
  return (
    <Suspense fallback={<p className="loading">正在整理机会…</p>}>
      <JobsPage />
    </Suspense>
  );
}
