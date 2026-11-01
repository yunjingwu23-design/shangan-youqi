import { adminPageIdentity } from '@/lib/admin/page';
import { AdminAnalytics } from '@/components/admin-analytics';
export default async function Page() {
  if (!(await adminPageIdentity())) return null;
  return <AdminAnalytics />;
}
