"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1>页面遇到了一点问题</h1>
      <p>请重试。若仍无法使用，请保留本地数据并稍后再试。</p>
      <button className="btn btn-outline" onClick={reset}>
        重新加载
      </button>
    </div>
  );
}
