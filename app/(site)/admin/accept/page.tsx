import { siteSession } from '@/lib/site-session';
import { AdminAccept } from '@/components/admin-accept';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const query = await searchParams,
    user = await siteSession(),
    token =
      typeof query.token === 'string' && /^[A-Za-z0-9_-]{40,128}$/.test(query.token)
        ? query.token
        : '';
  return <AdminAccept token={token} email={user?.email || null} />;
}
