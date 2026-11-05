import { SalaryCalculator } from '@/components/salary/calculator';
export const metadata = {
  title: '薪酬 / 社保计算器 · 上岸有期',
  description: '估算税后到手工资、个人与单位社保公积金、年终奖个税和全年用工成本。',
};
export default function Page() {
  return <SalaryCalculator initialPolicyMonth={new Date().toISOString().slice(0, 7)} />;
}
