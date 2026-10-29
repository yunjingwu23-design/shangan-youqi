import Link from "next/link";
export default function Page() {
  return (
    <div className="page-width page-section">
      <div className="empty">
        <h1>微信登录暂未开通</h1>
        <p>
          当前不会处理授权 code，也不会建立用户会话。请返回登录页查看接入状态。
        </p>
        <Link href="/login" className="btn btn-outline">
          返回登录页
        </Link>
      </div>
    </div>
  );
}
