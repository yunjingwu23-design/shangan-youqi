export default function Loading() {
  return (
    <main className="loading-screen" aria-busy="true">
      <div className="skeleton" />
      <h1>正在打开你的工作台…</h1>
      <p>正在安全读取个人资料与求职记录。</p>
    </main>
  );
}
