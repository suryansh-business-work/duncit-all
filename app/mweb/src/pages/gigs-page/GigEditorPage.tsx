import { useParams } from 'react-router';
import { GigJobEditor } from '@duncit/gig-jobs';
import GigsShell from './GigsShell';

/** /gigs/new and /gigs/:id/edit — post a gig, or edit one of your own. */
export default function GigEditorPage() {
  const { id } = useParams<{ id?: string }>();
  return (
    <GigsShell testId="gig-editor-page">
      <GigJobEditor key={id ?? 'new'} id={id} />
    </GigsShell>
  );
}
