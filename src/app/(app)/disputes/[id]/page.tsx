import type { Metadata } from "next";
import { DisputeDetail } from "./detail-view";

export const metadata: Metadata = { title: "Dispute · Sira" };

export default async function DisputeDetailPage({ params }: PageProps<"/disputes/[id]">) {
  const { id } = await params;
  return <DisputeDetail id={id} />;
}
