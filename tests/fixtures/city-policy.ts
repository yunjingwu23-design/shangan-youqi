// Test-only fabricated fixture. NEVER import this into application data or publish it as policy.
import { defaultPayrollInput } from '../../lib/salary/calculator';
import type { CityPolicy } from '../../lib/salary/city-policies';
export function fixtureCityPolicy(): CityPolicy {
  const v = defaultPayrollInput();
  v.socialBase.minimum = 6000;
  v.socialBase.maximum = 25000;
  v.housingBase.minimum = 5000;
  v.housingBase.maximum = 18000;
  v.rates.medical.bounds = { minimum: 6000, maximum: 10000 };
  return {
    id: 'test-only-shanghai-2026',
    cityId: 'shanghai',
    label: '自动化测试专用，非真实政策',
    validFrom: '2026-01-01',
    validThrough: '2026-12-31',
    verifiedOn: '2026-01-05',
    sources: [
      {
        title: '自动化测试专用文档，不是真实官方数据',
        url: 'https://rsj.sh.gov.cn/test-only/fixture-policy.html',
        publishedOn: '2026-01-01',
        retrievedAt: '2026-01-05T00:00:00.000Z',
        sha256: '0'.repeat(64),
        evidence:
          '这是自动化测试文档的假定原文摘录，仅用于验证程序，绝不能当作真实的城市缴费参数发布。',
      },
    ],
    parameters: {
      socialBase: v.socialBase,
      housingBase: v.housingBase,
      rates: v.rates,
      medicalExtra: v.medicalExtra,
      maternityMerged: v.maternityMerged,
    },
    assumptions: ['这是测试专用假定参数；生产数据目录为空，不发布任何测试费率。'],
  };
}
