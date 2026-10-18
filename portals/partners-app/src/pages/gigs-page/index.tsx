import { useParams } from 'react-router';
import { GigBoard, GigJobDetail, GigJobEditor, MyGigJobs } from '@duncit/gig-jobs';
import PartnersGigsShell from './PartnersGigsShell';

/** /gigs — the Gig Jobs board. */
export function GigsPage() {
  return (
    <PartnersGigsShell>
      <GigBoard />
    </PartnersGigsShell>
  );
}

/** /gigs/:id — one gig; its poster also sees the interested freelancers. */
export function GigDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  return (
    <PartnersGigsShell>
      <GigJobDetail key={id} id={id} />
    </PartnersGigsShell>
  );
}

/** /gigs/new and /gigs/:id/edit. */
export function GigEditorPage() {
  const { id } = useParams<{ id?: string }>();
  return (
    <PartnersGigsShell>
      <GigJobEditor key={id ?? 'new'} id={id} />
    </PartnersGigsShell>
  );
}

/** /gigs/mine — the partner's own gig posts. */
export function MyGigsPage() {
  return (
    <PartnersGigsShell>
      <MyGigJobs />
    </PartnersGigsShell>
  );
}
