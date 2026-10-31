import { InterviewHistory } from '@/components/interviews';
import { requireSiteUser } from '@/lib/site-session';
export default async function Page() {
  await requireSiteUser('/workspace/interviews');
  return <InterviewHistory />;
}
