import { requireSiteUser } from '@/lib/site-session';
import { Workspace } from '@/components/workspace';
export default async function Settings() {
  const { user, userId } = await requireSiteUser('/workspace/settings');
  return <Workspace email={user.email || ''} userId={userId} initialSettings />;
}
