import { InterviewDetail } from "@/components/modules";
import { posts } from "@/lib/data";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!posts.some((p) => p.id === id)) notFound();
  return <InterviewDetail id={id} />;
}
