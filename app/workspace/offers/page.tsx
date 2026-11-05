import Link from 'next/link';
import { requireSiteUser } from '@/lib/site-session';
import { PersonalSalary } from '@/components/salary/personal';
export const metadata = { title: 'Offer 对比 · 上岸有期' };
export default async function Page() {
  await requireSiteUser('/workspace/offers');
  return (
    <main className="salary-shell">
      <header className="salary-hero">
        <p className="site-eyebrow">YOUR NEXT CHAPTER</p>
        <h1>选适合自己的 Offer。</h1>
        <p>比较真实待遇，也比较未来生活的城市。个人对比表仅本人可见。</p>
        <div className="salary-actions">
          <Link href="/jobs/salary/calculator">薪酬 / 社保计算器：估算到手工资 ↗</Link>
        </div>
      </header>
      <PersonalSalary />
    </main>
  );
}
