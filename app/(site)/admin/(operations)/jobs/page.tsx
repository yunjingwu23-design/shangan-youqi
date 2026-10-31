import { adminPageIdentity } from '@/lib/admin/page';
import { CatalogAdmin } from '@/components/catalog-admin';
export default async function Page() {
  const identity = await adminPageIdentity();
  if (!identity) return null;
  return <CatalogAdmin role={identity.adminRole} />;
}
