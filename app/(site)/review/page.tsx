import { requireSiteUser } from '@/lib/site-session';
import { ReviewNotebook } from '@/components/preparation';
export default async function ReviewPage() {
  await requireSiteUser('/review');
  return <ReviewNotebook interviewsEnabled={process.env.INTERVIEWS_ENABLED === 'true'} />;
}
