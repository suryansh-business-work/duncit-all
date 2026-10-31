import { PageIntro, PortalTour, useFirstRunTour, type PortalTourStep } from '@duncit/ui';
import { useUserData } from '@duncit/user-context';

interface Props {
  /** Stable per page: keys the remembered intro state and the per-user tour record. */
  id: string;
  /** One line: what this page is for. */
  summary: string;
  /** What a person does here, in order. */
  steps: readonly string[];
  /** The spotlight tour over the page's `data-tour` anchors. */
  tour: readonly PortalTourStep[];
}

/**
 * The intro block and the first-run tour every runs page opens with. The
 * tour shows itself once per user and again from the intro's Start tour.
 */
export default function RunsGuide({ id, summary, steps, tour }: Readonly<Props>) {
  const { user } = useUserData();
  const { open, start, close } = useFirstRunTour(id, user?.user_id);
  return (
    <>
      <PageIntro id={id} summary={summary} steps={[...steps]} onStartTour={start} />
      <PortalTour open={open} steps={tour} onClose={close} />
    </>
  );
}
