import Link from 'next/link';
export default function ServiceOperations() {
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">SERVICE OPERATIONS</p>
        <h1>服务运营</h1>
        <p>管理服务开放状态与履约准备。</p>
      </div>
      <div className="ia-hub-grid">
        <section className="site-card">
          <h2>AI 面试复盘</h2>
          <span className="ia-status">
            {process.env.INTERVIEWS_ENABLED === 'true' ? '内部测试已开放' : '内测尚未开放'}
          </span>
          <p>沿用现有任务队列、额度与成本记录。全站服务监控面板待开发。</p>
          <Link className="site-text-link" href="/interview-center">
            查看前台服务说明 →
          </Link>
        </section>
        <section className="site-card">
          <h2>真人 Mock 服务</h2>
          <span className="ia-status pending">预约筹备中</span>
          <p>导师核验、排期、订单及履约管理仍待开发；前台只保存个人服务意向。</p>
        </section>
      </div>
    </main>
  );
}
