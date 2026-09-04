import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { changePenaltyFor, type PodChangeRole } from '@duncit/utils';
import { useTranslation } from './i18n';
import RequestChangeDialog from './RequestChangeDialog';
import { MY_POD_CHANGE_BOARD, REQUEST_POD_CHANGE } from './queries';

/** What a surface hands over when a row's menu item is picked. */
export interface RequestChangeSubject {
  podDocId: string;
  role: PodChangeRole;
  /** Seats already sold on that pod, for the dialog's warning. */
  attendeeCount: number;
}

interface Options {
  /** Called after the request is filed, so the surface can refetch its list. */
  onFiled?: (message: string) => void;
}

/**
 * The Request Change action, ready to drop onto any pod row.
 *
 * One hook, one dialog element, rendered ONCE per screen — the same shape
 * `useHostPodActions` settled on. The penalty is read from the board rather
 * than passed in by each caller: three surfaces guessing the number is three
 * chances to tell a partner it costs 5 when an admin has since set it to 2.
 */
export function useRequestPodChange(options?: Readonly<Options>) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState<RequestChangeSubject | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // cache-first: the numbers move only when an admin edits Pod Settings, and a
  // network round trip before a dialog can open would show the cost late.
  const board = useQuery<any>(MY_POD_CHANGE_BOARD, { fetchPolicy: 'cache-first' });
  const [file, fileState] = useMutation<any>(REQUEST_POD_CHANGE, {
    refetchQueries: [{ query: MY_POD_CHANGE_BOARD }],
  });

  const open = useCallback((next: RequestChangeSubject) => {
    setErrorText(null);
    setSubject(next);
  }, []);

  const close = useCallback(() => setSubject(null), []);

  const confirm = useCallback(
    (reason: string) => {
      if (!subject) return;
      file({
        variables: { pod_doc_id: subject.podDocId, role: subject.role, reason },
      })
        .then(() => {
          setSubject(null);
          options?.onFiled?.(t('changeRequest.filed'));
          return undefined;
        })
        .catch((error: Error) => setErrorText(error.message));
    },
    [file, options, subject, t]
  );

  const dialog = subject ? (
    <RequestChangeDialog
      open
      role={subject.role}
      penalty={changePenaltyFor(board.data?.myPodChangeBoard, subject.role)}
      attendeeCount={subject.attendeeCount}
      busy={fileState.loading}
      errorText={errorText}
      onClose={close}
      onConfirm={confirm}
    />
  ) : null;

  return { open, dialog, busy: fileState.loading };
}
