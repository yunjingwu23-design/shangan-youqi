import { Suspense } from "react";
import { SearchPage } from "@/components/jobs";
export default function Page() {
  return (
    <Suspense fallback={<p className="loading">正在查找内容…</p>}>
      <SearchPage />
    </Suspense>
  );
}
