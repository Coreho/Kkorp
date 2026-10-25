import { Site } from '@/components/Site';
import { ContentProvider } from '@/lib/useContent';

export default function Page() {
  return <ContentProvider><Site /></ContentProvider>;
}
