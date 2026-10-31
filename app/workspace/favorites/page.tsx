import { requireSiteUser } from '@/lib/site-session';
import { Workspace } from '@/components/workspace';
export default async function Favorites() {
  const { user, userId } = await requireSiteUser('/workspace/favorites');
  return <Workspace email={user.email || ''} userId={userId} initialKind="favorite" />;
}
