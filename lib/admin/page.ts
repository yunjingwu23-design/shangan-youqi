import 'server-only';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { siteManager } from '@/lib/catalog-server';

// Pages and layouts render concurrently. Handle the page's authorization failure
// too, so it cannot replace the layout's login/denied view with an error boundary.
export async function adminPageIdentity() {
  try {
    return await siteManager();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login?next=%2Fadmin');
    if (error instanceof ApiError && [403, 503].includes(error.status)) return null;
    throw error;
  }
}
