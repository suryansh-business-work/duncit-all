import { useState, type ReactNode } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation, type Translate } from '@duncit/shell';
import HideReasonDialog from './hide-reason-dialog';
import { SET_CLUB_HIDDEN, SET_POD_HIDDEN } from './queries';

export type VisibilityKind = 'POD' | 'CLUB';

/** The record being hidden or shown, and which way it currently stands. */
export interface VisibilityTarget {
  id: string;
  name: string;
  /** Its OWN flag — for a pod, not whether its club happens to be hidden. */
  hidden: boolean;
}

interface VisibilityCopy {
  hideTitle: string;
  hideBody: string;
  showTitle: string;
  showBody: string;
  hidden: string;
  shown: string;
}

/** Every key written out, per kind: the translation gate reads source for
 * literal keys and cannot see one assembled from the kind. */
function copyFor(kind: VisibilityKind, name: string, t: Translate): VisibilityCopy {
  const vars = { vars: { name } };
  if (kind === 'CLUB') {
    return {
      hideTitle: t('directory.visibility.hideClubTitle'),
      hideBody: t('directory.visibility.hideClubBody', vars),
      showTitle: t('directory.visibility.showClubTitle'),
      showBody: t('directory.visibility.showClubBody', vars),
      hidden: t('directory.visibility.clubHidden'),
      shown: t('directory.visibility.clubShown'),
    };
  }
  return {
    hideTitle: t('directory.visibility.hidePodTitle'),
    hideBody: t('directory.visibility.hidePodBody', vars),
    showTitle: t('directory.visibility.showPodTitle'),
    showBody: t('directory.visibility.showPodBody', vars),
    hidden: t('directory.visibility.podHidden'),
    shown: t('directory.visibility.podShown'),
  };
}

export interface VisibilityControls {
  /** Start a hide (opens the reason dialog) or a show (asks to confirm). */
  request: (target: VisibilityTarget) => Promise<void>;
  /** Mount once on the page — it is the reason dialog. */
  dialog: ReactNode;
}

/**
 * Hide and show, for the Pods console and the Clubs console alike.
 *
 * One hook for both because it is one decision with one rule — a reason to
 * hide, a confirm to show — and the two consoles have to agree on it: hiding a
 * club hides its pods, so the pod pages open elsewhere on the screen are
 * refetched here rather than left showing a pod as visible.
 *
 * `onChanged` is for the caller's own table, which reads through the table
 * engine instead of a watched query and so is not reached by that refetch.
 */
export function useVisibility(kind: VisibilityKind, onChanged?: () => void): VisibilityControls {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const [mutate, state] = useMutation(kind === 'CLUB' ? SET_CLUB_HIDDEN : SET_POD_HIDDEN);
  const [hiding, setHiding] = useState<VisibilityTarget | null>(null);

  const apply = async (target: VisibilityTarget, hidden: boolean, reason?: string) => {
    const copy = copyFor(kind, target.name, t);
    try {
      await mutate({ variables: { id: target.id, hidden, reason: reason ?? null } });
      await client.refetchQueries({ include: 'active' });
      notifySuccess(hidden ? copy.hidden : copy.shown);
      onChanged?.();
      return true;
    } catch (e) {
      notifyError((e as Error).message || t('directory.visibility.failed'));
      return false;
    }
  };

  const show = async (target: VisibilityTarget) => {
    const copy = copyFor(kind, target.name, t);
    const ok = await confirm({
      title: copy.showTitle,
      message: copy.showBody,
      confirmLabel: t('directory.visibility.show'),
    });
    if (ok) await apply(target, false);
  };

  const request = async (target: VisibilityTarget) => {
    if (target.hidden) await show(target);
    else setHiding(target);
  };

  const hideCopy = copyFor(kind, hiding?.name ?? '', t);

  return {
    request,
    dialog: (
      <HideReasonDialog
        open={!!hiding}
        title={hideCopy.hideTitle}
        body={hideCopy.hideBody}
        saving={state.loading}
        onClose={() => setHiding(null)}
        onSubmit={async ({ reason }) => {
          if (hiding && (await apply(hiding, true, reason))) setHiding(null);
        }}
      />
    ),
  };
}
