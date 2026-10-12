import { useConsoleAccess } from '../../shared/useConsoleAccess';
import { useVisibility } from '../../shared/visibility/useVisibility';
import { VisibilityButton } from '../../shared/visibility/VisibilityViews';

interface Props {
  podId: string;
  podTitle: string;
  /** The pod's OWN flag — a pod hidden only with its club is offered Hide. */
  hidden: boolean;
}

/**
 * Hide / Show in the pod page's header.
 *
 * Passed in by the admin console rather than living in the shared view, for the
 * reason Revoke cancellation is: only this console may do it. Renders nothing
 * for a viewer the server would refuse.
 */
export default function PodVisibilityAction({ podId, podTitle, hidden }: Readonly<Props>) {
  const { canGovern } = useConsoleAccess();
  const visibility = useVisibility('POD');
  if (!canGovern) return null;
  return (
    <>
      <VisibilityButton
        hidden={hidden}
        onClick={() => visibility.request({ id: podId, name: podTitle, hidden })}
      />
      {visibility.dialog}
    </>
  );
}
