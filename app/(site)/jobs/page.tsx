import { JobsExplorer } from '@/components/jobs';
import { publishedCatalog } from '@/lib/catalog-server';
import { siteSession } from '@/lib/site-session';
import { exampleJobs } from '@/lib/catalog';
export default async function JobsPage() {
  const [catalog, user] = await Promise.all([publishedCatalog(), siteSession()]);
  return (
    <JobsExplorer
      jobs={catalog.jobs.length ? catalog.jobs : exampleJobs}
      preview={!catalog.jobs.length}
      available={catalog.available}
      signedIn={Boolean(user)}
    />
  );
}
