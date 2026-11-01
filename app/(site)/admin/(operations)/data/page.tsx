import { adminPageIdentity } from '@/lib/admin/page';
import { AdminAnalytics } from '@/components/admin-analytics';
export default async function Page() {
  const identity = await adminPageIdentity();
  if (!identity) return null;
  return <AdminAnalytics />;
}
