import { redirect } from 'next/navigation';
import { actor, ApiError } from '@/lib/api';
import { Workspace } from '@/components/workspace';
export const dynamic = 'force-dynamic';
export default async function WorkspacePage() {
  let identity;
  try {
    identity = await actor();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login?reason=expired');
    throw error;
  }
  return (
    <Workspace
      email={identity.user.email || ''}
      userId={identity.userId}
      interviewsEnabled={process.env.INTERVIEWS_ENABLED === 'true'}
    />
  );
}
