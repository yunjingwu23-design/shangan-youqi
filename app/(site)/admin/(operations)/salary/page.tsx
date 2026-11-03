import { adminPageIdentity } from '@/lib/admin/page';
import { SalaryAdmin } from '@/components/salary/admin';
export default async function Page() {
  const identity = await adminPageIdentity();
  if (!identity) return null;
  return (
    <SalaryAdmin
      canReview={identity.adminRole === 'super_admin' || identity.adminRole === 'reviewer'}
    />
  );
}
