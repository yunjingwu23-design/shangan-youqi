'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading-screen">
      <h1>工作台暂时无法加载</h1>
      <p>请检查网络连接后重试。若尚未配置 Supabase，请按项目配置说明完成设置。</p>
      <button className="button primary" onClick={reset}>
        重新加载
      </button>
      <a href="/login">返回登录</a>
    </main>
  );
}
