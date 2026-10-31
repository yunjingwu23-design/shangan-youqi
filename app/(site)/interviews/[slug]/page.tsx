import { permanentRedirect } from 'next/navigation';
export default async function LegacyGuide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect('/resources/' + encodeURIComponent(slug));
}
