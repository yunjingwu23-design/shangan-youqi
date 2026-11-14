import { requireSiteUser } from '@/lib/site-session';
import { PrepPlan } from '@/components/prep-plan';
export default async function Plan() {
  await requireSiteUser('/interview-center/plan');
  return <PrepPlan />;
}
