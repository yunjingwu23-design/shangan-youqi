import { requireSiteUser } from '@/lib/site-session';
import { MockPractice } from '@/components/preparation';
export default async function Practice({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  await requireSiteUser('/interview-center/practice' + (id ? '?id=' + encodeURIComponent(id) : ''));
  return <MockPractice signedIn mode="practice" />;
}
