import { FeatureState } from '@/components/feature-state';
export default function Calendar() {
  return (
    <FeatureState
      title="招聘日历"
      description="把握招聘季，也尊重每个岗位真实的时间信息。"
      details={[
        '按日历查看核验后的招聘开放与截止日期',
        '按秋招、春招、实习分类筛选',
        '将重要节点加入个人日程',
      ]}
      href="/jobs"
      action="先浏览当前岗位"
    />
  );
}
