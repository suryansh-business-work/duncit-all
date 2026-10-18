import { useParams } from 'react-router';
import { GigJobDetail } from '@duncit/gig-jobs';
import GigsShell from './GigsShell';

/** /gigs/:id — one gig; the poster also sees who is interested. */
export default function GigDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  return (
    <GigsShell testId="gig-detail-page">
      <GigJobDetail key={id} id={id} />
    </GigsShell>
  );
}
