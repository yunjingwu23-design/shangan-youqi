import { siteManager } from '@/lib/catalog-server';
export default async function DataCenter() {
  const { db } = await siteManager();
  const states = ['published', 'draft', 'closed'] as const;
  const counts = await Promise.all(
    states.map(async (state) => {
      const result = await db
        .from('job_catalog')
        .select('id', { count: 'exact', head: true })
        .eq('state', state);
      return result.error ? null : result.count;
    })
  );
  return (
    <main className="site-main">
      <div className="site-page-title">
        <p className="site-eyebrow">DATA CENTER</p>
        <h1>数据中心</h1>
        <p>当前展示岗位目录的实时计数。访问与转化统计尚未接入。</p>
      </div>
      <div className="ia-featured-grid">
        {states.map((state, i) => (
          <section className="site-card" key={state}>
            <p>{['已发布岗位', '草稿岗位', '已关闭岗位'][i]}</p>
            <h2>{counts[i] ?? '暂无法读取'}</h2>
          </section>
        ))}
      </div>
    </main>
  );
}
