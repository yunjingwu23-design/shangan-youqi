import { z } from 'zod';
import { defaultPayrollInput, payrollSchema, type PayrollInput } from './calculator';

export const cityDirectory = [
  {
    id: 'shanghai',
    name: '上海',
    hosts: [
      'rsj.sh.gov.cn',
      'ybj.sh.gov.cn',
      'gjj.sh.gov.cn',
      'www.shgjj.com',
      'www.shzfgjj.cn',
      'shzfgjj.cn',
      'www.shanghai.gov.cn',
    ],
  },
  {
    id: 'beijing',
    name: '北京',
    hosts: ['rsj.beijing.gov.cn', 'ybj.beijing.gov.cn', 'gjj.beijing.gov.cn', 'www.beijing.gov.cn'],
  },
  {
    id: 'shenzhen',
    name: '深圳',
    hosts: [
      'hrss.sz.gov.cn',
      'szsi.sz.gov.cn',
      'ybj.sz.gov.cn',
      'gjj.sz.gov.cn',
      'zjj.sz.gov.cn',
      'hsa.sz.gov.cn',
      'hrss.gd.gov.cn',
      'www.sz.gov.cn',
    ],
  },
  {
    id: 'guangzhou',
    name: '广州',
    hosts: [
      'rsj.gz.gov.cn',
      'ybj.gz.gov.cn',
      'gjj.gz.gov.cn',
      'hrss.gd.gov.cn',
      'www.gz.gov.cn',
    ],
  },
] as const;
export type CityId = (typeof cityDirectory)[number]['id'];
const isoDate = z.iso.date();
const sourceSchema = z
  .object({
    title: z.string().trim().min(4).max(250),
    url: z.url().max(2000),
    publishedOn: isoDate,
    retrievedAt: z.iso.datetime(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    evidence: z.string().trim().min(20).max(12000),
  })
  .strict();
// Each actual profile must be curated from retrieved primary documents, not examples.
const parametersSchema = z
  .object({
    socialBase: payrollSchema.shape.socialBase,
    housingBase: payrollSchema.shape.housingBase,
    rates: payrollSchema.shape.rates,
    medicalExtra: payrollSchema.shape.medicalExtra,
    maternityMerged: payrollSchema.shape.maternityMerged,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.socialBase.mode !== 'salary' || v.housingBase.mode !== 'salary')
      ctx.addIssue({
        code: 'custom',
        message: '自动政策必须随用户月薪重新计算基数，不能锁定示例工资。',
      });
    if (
      v.socialBase.minimum === null ||
      v.socialBase.maximum === null ||
      v.housingBase.minimum === null ||
      v.housingBase.maximum === null
    )
      ctx.addIssue({ code: 'custom', message: '自动政策必须已核验社保与公积金上下限。' });
    for (const r of Object.values(v.rates))
      if (r.baseOverride !== null)
        ctx.addIssue({ code: 'custom', message: '自动政策不能写死单项示例基数。' });
  });
export const cityPolicySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,100}$/),
    cityId: z.enum(['shanghai', 'beijing', 'shenzhen', 'guangzhou']),
    label: z.string().trim().min(2).max(120),
    validFrom: isoDate,
    validThrough: isoDate,
    verifiedOn: isoDate,
    sources: z.array(sourceSchema).min(1).max(20),
    parameters: parametersSchema,
    assumptions: z.array(z.string().trim().min(4).max(350)).min(1).max(12),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.validFrom > v.validThrough)
      ctx.addIssue({ code: 'custom', message: '政策有效期起止顺序无效。' });
    const city = cityDirectory.find((c) => c.id === v.cityId)!;
    for (const s of v.sources) {
      let u: URL;
      try {
        u = new URL(s.url);
      } catch {
        ctx.addIssue({ code: 'custom', message: '政策来源链接无效。' });
        continue;
      }
      if (
        u.protocol !== 'https:' ||
        u.username ||
        u.password ||
        (u.port && u.port !== '443') ||
        !city.hosts.some((h) => h === u.hostname) ||
        u.pathname === '/'
      )
        ctx.addIssue({ code: 'custom', message: '来源必须为该城市官方域名下的具体政策原文。' });
      if (s.publishedOn > v.verifiedOn || s.retrievedAt.slice(0, 10) > v.verifiedOn)
        ctx.addIssue({ code: 'custom', message: '政策核验日期不能早于来源发布或获取日期。' });
    }
    // Reuse the full calculation contract to catch injury/maternity and base/rate inconsistencies.
    const calculation = payrollSchema.safeParse({ ...defaultPayrollInput(), ...v.parameters });
    if (!calculation.success)
      ctx.addIssue({ code: 'custom', message: '政策缴费参数不符合计算口径。' });
  });
export type CityPolicy = z.infer<typeof cityPolicySchema>;
export const cityPoliciesResponseSchema = z
  .object({
    policies: z.array(cityPolicySchema),
    status: z.enum(['ready', 'awaiting_verification']),
    message: z.string().max(500),
  })
  .strict();
export function validatePolicyCatalog(raw: unknown, today = new Date().toISOString().slice(0, 10)) {
  const policies = z.array(cityPolicySchema).parse(raw);
  const ids = new Set<string>();
  for (const p of policies) {
    if (ids.has(p.id)) throw new Error('政策版本标识重复');
    ids.add(p.id);
    if (p.verifiedOn > today) throw new Error('政策核验日期不能在未来');
    for (const other of policies)
      if (
        other.id !== p.id &&
        other.cityId === p.cityId &&
        p.validFrom <= other.validThrough &&
        other.validFrom <= p.validThrough
      )
        throw new Error('同城政策有效期重叠，须先拆分版本后发布');
  }
  return policies;
}
export function findCityPolicy(policies: CityPolicy[], cityId: string, month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const start = month + '-01';
  const [year, m] = month.split('-').map(Number);
  const end = month + '-' + new Date(Date.UTC(year, m, 0)).getUTCDate().toString().padStart(2, '0');
  return (
    policies.find((p) => p.cityId === cityId && p.validFrom <= start && p.validThrough >= end) ??
    null
  );
}
export function applyCityPolicy(
  input: PayrollInput,
  policy: CityPolicy,
  month: string
): PayrollInput {
  const p = cityPolicySchema.parse(policy);
  if (!findCityPolicy([p], p.cityId, month))
    throw new Error('政策不覆盖所选月份，不能套用旧版本。');
  const city = cityDirectory.find((c) => c.id === p.cityId)!;
  // Validate personal input in calculatePayroll, so incomplete edits do not crash the UI.
  return {
    ...input,
    ...structuredClone(p.parameters),
    city: city.name,
    year: Number(month.slice(0, 4)),
    deductibleContributions: null,
  };
}
