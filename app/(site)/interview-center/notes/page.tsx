import { requireSiteUser } from '@/lib/site-session';
import { ReviewNotebook } from '@/components/preparation';
export default async function Notes({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  await requireSiteUser('/interview-center/notes' + (id ? '?id=' + encodeURIComponent(id) : ''));
  return <ReviewNotebook interviewsEnabled={process.env.INTERVIEWS_ENABLED === 'true'} />;
}
