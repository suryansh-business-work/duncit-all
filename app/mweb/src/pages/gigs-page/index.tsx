import { GigBoard } from '@duncit/gig-jobs';
import GigsShell from './GigsShell';

/** /gigs — the Gig Jobs board (sidebar: Gig Jobs). */
export default function GigsPage() {
  return (
    <GigsShell testId="gigs-page">
      <GigBoard />
    </GigsShell>
  );
}
