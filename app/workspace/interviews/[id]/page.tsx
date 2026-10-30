import { redirect } from 'next/navigation';
import { z } from 'zod';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  z.uuid().parse(id);
  redirect(`/workspace/interviews/${id}/progress`);
}
