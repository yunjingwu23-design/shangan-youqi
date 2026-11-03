import { z } from 'zod';
const label = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((v) => !/[@\n\r]|https?:|\d{7,}/i.test(v), '请勿填写姓名、联系方式或链接');
const amount = z.number().finite().min(0).max(100000000).nullable();
export const salarySchema = z
  .object({
    company: label,
    role: label,
    city: label,
    cohort: z.number().int().min(2000).max(2100),
    education: z.enum(['专科', '本科', '硕士', '博士', '其他']),
    data_year: z
      .number()
      .int()
      .min(2000)
      .max(new Date().getFullYear() + 1),
    basis: z.enum(['monthly', 'annual', 'daily']),
    base_salary: z.number().finite().positive().max(100000000),
    salary_months: z.number().min(1).max(24),
    bonus: amount,
    stock: amount,
    subsidy: amount,
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.basis !== 'monthly' && v.salary_months !== 12)
      ctx.addIssue({
        code: 'custom',
        message: '年薪和实习日薪口径请保持薪资月数为 12（不参与换算）',
      });
    if (v.basis === 'daily' && [v.bonus, v.stock, v.subsidy].some((n) => n !== null))
      ctx.addIssue({ code: 'custom', message: '实习日薪不与年度奖金、股票、补贴混用，请留空' });
  });
export type SalaryInput = z.infer<typeof salarySchema>;
export const basisLabels = { monthly: '税前月薪', annual: '税前年基本工资', daily: '实习税前日薪' };
export function compensation(v: SalaryInput) {
  if (v.basis === 'daily') return { fixed: null, total: null };
  const fixed = v.basis === 'monthly' ? v.base_salary * v.salary_months : v.base_salary;
  return {
    fixed,
    total: [v.bonus, v.stock, v.subsidy].some((n) => n === null)
      ? null
      : fixed + v.bonus! + v.stock! + v.subsidy!,
  };
}
export const salaryDefaults: SalaryInput = {
  company: '',
  role: '',
  city: '',
  cohort: new Date().getFullYear() + 1,
  education: '本科',
  data_year: new Date().getFullYear(),
  basis: 'monthly',
  base_salary: 0,
  salary_months: 12,
  bonus: null,
  stock: null,
  subsidy: null,
};
export const salaryStatuses: Record<string, string> = {
  pending: '待审核',
  approved: '审核通过',
  rejected: '需修改',
  hidden: '已隐藏',
};
