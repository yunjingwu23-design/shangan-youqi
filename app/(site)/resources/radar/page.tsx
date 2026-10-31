import { FeatureState } from '@/components/feature-state';
export default function Radar() {
  return (
    <FeatureState
      title="全网面经雷达"
      description="发现有出处、可追溯的面试经验。"
      details={[
        '按公司、岗位与面试轮次发现公开面经',
        '保留原始链接、发布时间和来源标识',
        '遵守内容平台访问规则与作者授权',
      ]}
      href="/resources"
      action="先阅读免费面经与指南"
    />
  );
}
