import Link from 'next/link';
export default function ContentOperations() {
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">CONTENT OPERATIONS</p>
        <h1>内容运营</h1>
        <p>统一管理内容录入、来源核验与发布。</p>
      </div>
      <div className="ia-hub-grid">
        <section className="site-card">
          <span className="ia-status">已开放</span>
          <h2>岗位管理与 JD 录入</h2>
          <p>保留现有岗位新增、JD 文本录入、别名、留用依据、核验发布及下架能力。</p>
          <Link className="button primary" href="/admin/jobs">
            打开岗位管理 →
          </Link>
        </section>
        <section className="site-card">
          <span className="ia-status pending">开发中</span>
          <h2>面经与授权资料</h2>
          <p>计划统一管理原创内容、来源追踪和版权授权。未开放付费资料发布与交易。</p>
        </section>
      </div>
    </main>
  );
}
