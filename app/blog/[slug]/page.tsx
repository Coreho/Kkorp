import { notFound } from 'next/navigation';
import { PostPage } from '@/components/PostPage';
import { ContentProvider } from '@/lib/useContent';
import { slugPattern } from '@/mockups/koreokorp-v2/content-model.js';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Addresses no entry could ever have get a real 404 without loading anything.
  if (slug.length > 80 || !slugPattern.test(slug)) notFound();
  return <ContentProvider><PostPage slug={slug} /></ContentProvider>;
}
