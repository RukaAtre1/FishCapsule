import { Suspense } from "react";
import LearnClient from "./LearnClient";
import Shell from "../components/Shell";

export default function LearnPage() {
  return (
    <Shell>
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="skeleton h-10 w-72" />
            <div className="skeleton h-6 w-52" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="skeleton h-48 w-full" />
              ))}
            </div>
          </div>
        }
      >
        <LearnClient />
      </Suspense>
    </Shell>
  );
}
