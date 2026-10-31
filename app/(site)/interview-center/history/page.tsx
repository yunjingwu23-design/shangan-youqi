import { requireSiteUser } from '@/lib/site-session';
import { PersonalInterviewHistory } from '@/components/personal-interview-history';
export default async function History() {
  await requireSiteUser('/interview-center/history');
  return <PersonalInterviewHistory interviewsEnabled={process.env.INTERVIEWS_ENABLED === 'true'} />;
}
