import { PageSkeleton } from "@/components/app/Skeleton";

/** Shown while a dashboard page loads; the sidebar and top bar stay put. */
export default function Loading() {
  return <PageSkeleton />;
}
