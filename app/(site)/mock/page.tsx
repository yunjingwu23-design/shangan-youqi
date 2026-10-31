import { siteSession } from '@/lib/site-session';
import { MockPractice } from '@/components/preparation';
export default async function MockPage() {
  return <MockPractice signedIn={Boolean(await siteSession())} />;
}
