import { permanentRedirect } from 'next/navigation';
export default async function LegacyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  permanentRedirect('/interview-center/notes' + (id ? '?id=' + encodeURIComponent(id) : ''));
}
