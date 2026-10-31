import { adminPageIdentity } from '@/lib/admin/page';
import { AdminDashboard } from '@/components/admin-dashboard';
export default async function Page() {
  const identity = await adminPageIdentity();
  if (!identity) return null;
  return <AdminDashboard role={identity.adminRole} />;
}
