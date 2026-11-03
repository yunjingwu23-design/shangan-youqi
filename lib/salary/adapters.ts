import type { SalaryInput } from './model';
// No provider is activated merely by registering an adapter. This module never fetches private APIs.
export interface LicensedSalaryRecord {
  salary: SalaryInput;
  sourceUrl: string;
  sourceName: string;
  authorizationId: string;
  retrievedAt: string;
}
export interface SalaryDataAdapter {
  readonly id: string;
  readonly authorization: { agreementId: string; documentationUrl: string; expiresAt: string };
  query(
    filters: Partial<Pick<SalaryInput, 'company' | 'role' | 'city' | 'cohort' | 'education'>>
  ): Promise<LicensedSalaryRecord[]>;
}
export const thirdPartyStatus = {
  offershow: { enabled: false, reason: '等待正式授权和接口文档；未调用 API、未导入数据。' },
} as const;
export function assertLicensed(adapter: SalaryDataAdapter, now = Date.now()) {
  if (
    !adapter.authorization.agreementId ||
    !adapter.authorization.documentationUrl.startsWith('https://') ||
    Date.parse(adapter.authorization.expiresAt) <= now ||
    !Number.isFinite(Date.parse(adapter.authorization.expiresAt))
  )
    throw new Error('数据源授权或接口文档缺失/已过期');
}
