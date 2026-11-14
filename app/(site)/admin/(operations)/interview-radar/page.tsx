import { adminPageIdentity } from '@/lib/admin/page';
import { InterviewRadarAdmin } from '@/components/interview-radar-admin';
export default async function Page() {
  const identity = await adminPageIdentity();
  if (!identity) return null;
  return (
    <InterviewRadarAdmin
      canReview={identity.adminRole === 'super_admin' || identity.adminRole === 'reviewer'}
    />
  );
}
