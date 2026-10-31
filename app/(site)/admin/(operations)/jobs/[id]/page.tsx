import { notFound } from 'next/navigation';
import { z } from 'zod';
import { adminPageIdentity } from '@/lib/admin/page';
import { AdminJobEditor } from '@/components/admin-job-editor';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const identity = await adminPageIdentity();
  if (!identity) return null;
  return <AdminJobEditor id={id} role={identity.adminRole} userId={identity.userId} />;
}
