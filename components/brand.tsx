import Link from 'next/link';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="上岸有期首页">
      <img src="/logo-original.png" alt="上岸有期官方 Logo" width="76" height="76" />
      <span>
        <strong>上岸有期</strong>
        <small>YOUR CAREER, YOUR WAY</small>
      </span>
    </Link>
  );
}
