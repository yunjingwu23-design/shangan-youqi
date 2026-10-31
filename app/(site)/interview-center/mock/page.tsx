import { siteSession } from '@/lib/site-session';
import { MockPractice } from '@/components/preparation';
export default async function MockService() {
  return <MockPractice signedIn={Boolean(await siteSession())} mode="service" />;
}
