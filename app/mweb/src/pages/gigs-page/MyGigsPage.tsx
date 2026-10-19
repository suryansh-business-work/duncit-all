import { MyGigJobs } from '@duncit/gig-jobs';
import GigsShell from './GigsShell';

/** /gigs/mine — the viewer's own gig posts. */
export default function MyGigsPage() {
  return (
    <GigsShell testId="my-gigs-page">
      <MyGigJobs />
    </GigsShell>
  );
}
