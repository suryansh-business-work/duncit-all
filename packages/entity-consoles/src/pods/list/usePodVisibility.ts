import { useCallback } from 'react';
import { useConsoleAccess } from '../../shared/useConsoleAccess';
import { useVisibility } from '../../shared/visibility/useVisibility';
import type { PodRow } from './queries';

/**
 * The Pods list's Hide / Show action.
 *
 * `onToggle` is undefined for a viewer who may not hide a pod, which is how the
 * row drops the button instead of offering one the server would refuse. It acts
 * on the pod's OWN flag: a pod that is only hidden with its club is offered
 * Hide, because there is nothing of its own to show.
 */
export default function usePodVisibility(onChanged: () => void) {
  const { canGovern } = useConsoleAccess();
  const visibility = useVisibility('POD', onChanged);
  const toggle = useCallback(
    (p: PodRow) => visibility.request({ id: p.id, name: p.pod_title, hidden: !!p.is_hidden }),
    // `request` is rebuilt each render but closes over nothing that goes stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return { onToggle: canGovern ? toggle : undefined, dialog: visibility.dialog };
}
