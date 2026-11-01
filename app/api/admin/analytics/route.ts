import { NextResponse } from 'next/server';
import { api, ApiError } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';
import { analyticsRange } from '@/lib/analytics/model';
export const GET = api(async (request) => {
  const identity = await siteManager();
  let range;
  try {
    range = analyticsRange(new URL(request.url).searchParams);
  } catch {
    throw new ApiError(400, '请选择最近 90 天内的有效日期范围。');
  }
  const result = await identity.db
    .rpc('admin_site_analytics', { from_date: range.from, to_date: range.to })
    .abortSignal(AbortSignal.timeout(10000));
  if (result.error) throw new ApiError(503, '分析数据暂不可用，请确认数据分析迁移已执行。');
  return NextResponse.json({
    ...result.data,
    capabilities: { aiEnabled: process.env.INTERVIEWS_ENABLED === 'true', liveMockEnabled: false },
  });
});
