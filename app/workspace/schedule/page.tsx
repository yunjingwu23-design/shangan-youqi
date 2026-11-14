import { requireSiteUser } from '@/lib/site-session';
import { SchedulePlanner } from '@/components/schedule-planner';

export const metadata = { title: '日程与提醒 · 上岸有期' };

export default async function SchedulePage() {
  await requireSiteUser('/workspace/schedule');
  return (
    <main className="site-main sched-page">
      <div className="site-page-title">
        <p className="site-eyebrow">ONE STEP AT A TIME</p>
        <h1>个人日程与提醒</h1>
        <p>把重要的求职节点放进自己的节奏。投递截止、笔试、面试与复盘，都能排进同一张日历。</p>
      </div>
      <SchedulePlanner />
    </main>
  );
}
