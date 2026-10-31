import { FeatureState } from '@/components/feature-state';
export default function Store() {
  return (
    <FeatureState
      title="原创及授权面经商城"
      description="让有价值的经验，得到尊重与合理流通。"
      status="内容与交易筹备中"
      details={[
        '展示已核验版权的原创与授权资料',
        '提供清晰的内容预览、价格和售后规则',
        '购买后统一保存至我的资料',
      ]}
      href="/resources"
      action="先看看免费内容"
    />
  );
}
