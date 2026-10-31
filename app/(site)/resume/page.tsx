import { requireSiteUser } from '@/lib/site-session';
import { ResumeStudio } from '@/components/resume-studio';
export default async function ResumePage() {
  const { user } = await requireSiteUser('/resume');
  return <ResumeStudio email={user.email || ''} />;
}
