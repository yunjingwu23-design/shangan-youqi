import { requireSiteUser } from '@/lib/site-session';
import { FeatureState } from '@/components/feature-state';
export default async function Schedule() {
  await requireSiteUser('/workspace/schedule');
  return (
    <FeatureState
      title="个人日程与提醒"
      description="把重要的求职节点放进自己的节奏。"
      details={[
        '安排投递截止、面试与复盘时间',
        '关联个人工作台中的岗位',
        '可配置的站内提醒与通知；当前不会发送提醒',
      ]}
      href="/workspace"
      action="先更新我的投递进度"
    />
  );
}
