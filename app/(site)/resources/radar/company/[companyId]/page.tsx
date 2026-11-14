import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { listCompanies, listExperiences, listRoles } from '@/lib/interview-radar/server';
import { recruitmentTypes, roleCategories } from '@/lib/interview-radar/types';

export default async function CompanyRadarPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const [companies, roles, experiences] = await Promise.all([
    listCompanies(),
    listRoles(companyId),
    listExperiences({ companyId, limit: 200 }),
  ]);
  const company = companies.find((c) => c.id === companyId);
  if (!company) notFound();

  const byRole = new Map<string, typeof experiences>();
  for (const e of experiences) {
    const list = byRole.get(e.job_role_id) ?? [];
    list.push(e);
    byRole.set(e.job_role_id, list);
  }

  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">COMPANY PROFILE</p>
        <h1>
          <Building2 size={26} style={{ display: 'inline', marginRight: 8, verticalAlign: '-4px' }} />
          {company.name}
        </h1>
        <p>
          {company.english_name && `${company.english_name} · `}
          {company.industry && `${company.industry} · `}
          {company.company_group && `集团：${company.company_group} · `}
          {company.verified_status === 'verified' ? '已核验主体' : '待核验主体'}
        </p>
      </div>

      <div className="site-notice">
        以下为该公司的已核实面经，按岗位分组。不同业务方向的面经已保留细分，不做错误合并。
      </div>

      <div className="company-role-grid">
        {roles.map((role) => {
          const list = byRole.get(role.id) ?? [];
          return (
            <section className="site-card" key={role.id}>
              <div className="radar-card-head">
                <span className="job-badge">{roleCategories[role.category] ?? '其他岗位'}</span>
                <span className="job-badge">{list.length} 篇</span>
              </div>
              <h2>{role.name}</h2>
              {list.length > 0 ? (
                <ul className="radar-role-links">
                  {list.slice(0, 5).map((e) => (
                    <li key={e.id}>
                      <Link href={`/resources/radar/experience/${e.id}`}>
                        {e.title}
                        <small>
                          {recruitmentTypes[e.recruitment_type] ?? '未确定'}
                          {e.cohort ? ` · ${e.cohort}` : ''}
                        </small>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>暂无已核实面经。</p>
              )}
              {list.length > 5 && (
                <Link
                  className="site-text-link"
                  href={`/resources/radar/experience?roleId=${role.id}`}
                >
                  查看全部 {list.length} 篇 →
                </Link>
              )}
            </section>
          );
        })}
        {roles.length === 0 && (
          <section className="site-card">
            <p>该公司的岗位分类尚未建立，或暂无已核实面经。</p>
            <Link className="site-text-link" href="/resources/radar/submit">
              提交面经帮助建立 →
            </Link>
          </section>
        )}
      </div>

      <div className="site-actions" style={{ marginTop: 16 }}>
        <Link className="button secondary" href="/resources/radar">
          ← 返回面经雷达
        </Link>
      </div>
    </main>
  );
}
