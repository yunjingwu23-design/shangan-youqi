import { AdminFeedback } from '@/components/admin-feedback';
import { adminPageIdentity } from '@/lib/admin/page';

export default async function Page() {
  const identity = await adminPageIdentity();
  if (!identity) return null;
  return <AdminFeedback />;
}
