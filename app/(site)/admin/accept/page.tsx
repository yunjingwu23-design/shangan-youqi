import { siteSession } from '@/lib/site-session';
import { AdminAccept } from '@/components/admin-accept';
import { invitationDetails } from '@/lib/admin/invitations';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; sent?: string }>;
}) {
  const query = await searchParams,
    user = await siteSession(),
    token =
      typeof query.token === 'string' && /^[A-Za-z0-9_-]{40,128}$/.test(query.token)
        ? query.token
        : '';
  let invitation = null,
    unavailable = '';
  try {
    invitation = token ? await invitationDetails(token) : null;
  } catch {
    unavailable = '邀请暂时无法读取，请稍后重试或联系邀请人。';
  }
  const age = invitation
    ? Math.max(0, Math.floor((Date.now() - new Date(invitation.createdAt).getTime()) / 1000))
    : 0;
  const codeSent = query.sent === '1' && !!invitation && age < 600;
  return (
    <AdminAccept
      token={token}
      email={user?.email_confirmed_at ? user.email || null : null}
      invitation={invitation}
      unavailable={unavailable}
      codeSent={codeSent}
      cooldown={codeSent ? Math.max(0, 60 - age) : 0}
    />
  );
}
