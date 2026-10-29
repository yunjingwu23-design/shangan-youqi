import { Admin } from "@/components/modules";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!["jobs", "import", "content", "dictionaries"].includes(section))
    notFound();
  return <Admin />;
}
