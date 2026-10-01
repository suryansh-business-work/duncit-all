import { Suspense, lazy } from 'react';
import { Loader } from '@duncit/ui';

/**
 * The studio is the one page that carries Remotion and its video decoder — well
 * over a megabyte that no other page in this console needs — so it is fetched
 * when a reel is opened rather than shipped to everyone who signs in.
 *
 * The split lives here, not in `App.tsx`, so the route table stays what it is
 * in every other console: a flat list of pages.
 */
const ReelStudio = lazy(() => import('./index'));

export default function ReelStudioPage() {
  return (
    <Suspense fallback={<Loader variant="page" />}>
      <ReelStudio />
    </Suspense>
  );
}
