import { notFound } from 'next/navigation';
import { z } from 'zod';
import { InterviewDetailPage } from '@/components/interviews';
export default async function Page({ params }: { params: Promise<{ id: string; view: string }> }) {
  const { id, view } = await params;
  if (!z.uuid().safeParse(id).success || !['progress', 'transcript', 'report'].includes(view))
    notFound();
  return <InterviewDetailPage id={id} view={view} />;
}
