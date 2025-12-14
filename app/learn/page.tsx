import { Suspense } from "react";
import LearnClient from "./LearnClient";

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <div className="mx-auto max-w-5xl p-6">Loading…</div>
        </div>
      }
    >
      <LearnClient />
    </Suspense>
  );
}
