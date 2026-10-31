import { requireSiteUser } from '@/lib/site-session';
import { ResumeStudio } from '@/components/resume-studio';
export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const { user } = await requireSiteUser('/resume' + (id ? '?id=' + encodeURIComponent(id) : ''));
  return <ResumeStudio email={user.email || ''} />;
}
