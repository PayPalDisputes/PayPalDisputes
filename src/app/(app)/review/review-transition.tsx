"use client";

import { useEffect, useState } from "react";
import { ReviewDraftSkeleton } from "@/components/app/Skeleton";

/** How long the loading screen shows before each draft, so moving between drafts reads as a step. */
const LOADING_MS = 1100;

/** A short loading screen before each draft. Keyed by dispute, so it runs again for every draft. */
export function ReviewTransition({ first, children }: { first: boolean; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), LOADING_MS);
    return () => clearTimeout(t);
  }, []);
  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <ReviewDraftSkeleton label={first ? "Loading your drafts…" : "Loading the next draft…"} />
      </div>
    );
  }
  return <>{children}</>;
}
