import { permanentRedirect } from 'next/navigation';
export default async function LegacyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  permanentRedirect(
    id ? '/interview-center/practice?id=' + encodeURIComponent(id) : '/interview-center/mock'
  );
}
