import { requireSiteUser } from '@/lib/site-session';
import { ResourceLibrary } from '@/components/resource-library';
export default async function MyResources() {
  await requireSiteUser('/resources/mine');
  return <ResourceLibrary />;
}
