import { NextResponse } from 'next/server';
import policyData from '@/lib/salary/city-policy-data.json';
import { validatePolicyCatalog } from '@/lib/salary/city-policies';
export async function GET() {
  try {
    const policies = validatePolicyCatalog(policyData);
    return NextResponse.json(
      {
        policies,
        status: policies.length ? 'ready' : 'awaiting_verification',
        message: policies.length
          ? '按已核验政策版本加载。'
          : '官方政策正在核验中；未核验的城市或月份不会自动套用演示数值。',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: '政策版本暂不可用，请稍后重试。' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
