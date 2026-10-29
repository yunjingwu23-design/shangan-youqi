import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <span className="eyebrow">404 / A DIFFERENT DIRECTION</span>
      <h1>这条路，暂时还没开通。</h1>
      <p>回到岗位广场，看看下一份机会。</p>
      <Link className="btn btn-primary" href="/jobs">
        前往岗位广场
      </Link>
    </div>
  );
}
