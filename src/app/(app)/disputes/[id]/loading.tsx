import { DisputePageSkeleton } from "@/components/app/Skeleton";

/**
 * Shown the moment a full dispute page is opened (from the list or the panel's "Full page"), while
 * the dispute, its report and the buyer's history load. The app-wide loading screen sits above the
 * disputes list, so moving from the list to one dispute never triggered it.
 */
export default function Loading() {
  return <DisputePageSkeleton />;
}
