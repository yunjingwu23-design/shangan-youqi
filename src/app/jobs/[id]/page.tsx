import { jobs } from "@/lib/data";
import { JobDetail } from "@/components/jobs";
import { notFound } from "next/navigation";
export const dynamicParams = false;
export function generateStaticParams() {
  return jobs.map((j) => ({ id: j.id }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = jobs.find((j) => j.id === id);
  if (!job) notFound();
  return <JobDetail job={job} />;
}
