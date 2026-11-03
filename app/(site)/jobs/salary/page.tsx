import { SalaryExplorer } from '@/components/salary/explorer';
import { siteSession } from '@/lib/site-session';
export const metadata = { title: '查薪资 · 上岸有期' };
export default async function Page() {
  const user = await siteSession();
  return <SalaryExplorer signedIn={!!user} />;
}
