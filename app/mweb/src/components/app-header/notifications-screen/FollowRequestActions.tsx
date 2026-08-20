import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { canFollowBack, followBackLabelKey, followRequestRowState } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  ANSWER_FOLLOW_REQUEST,
  FOLLOW_USER,
  REJECT_FOLLOW_REQUEST,
} from '../../../pages/hosts-venues-page/queries';

interface Props {
  /** The notification's action kind — anything but FOLLOW_REQUEST renders nothing. */
  actionType?: string | null;
  requestId?: string | null;
  /** Live status of the request — PENDING is the only state with Accept/Deny. */
  status?: string | null;
  /** The requester, i.e. who a Follow Back would follow. */
  actorId?: string | null;
  /** The viewer's own follow state towards that requester. FOLLOWING is what
   * hides Follow Back — they are already followed, so there is nothing to do. */
  followBackStatus?: string | null;
  /** The row is unread, so it is painted with the primary gradient — the text
   * buttons inherit its ink instead of using palette colours that vanish on it. */
  unreadRow?: boolean;
  /** Lets the inbox re-read counts/rows once the request is answered. */
  onAnswered: () => void;
}

/** Shared sx for the row's text buttons: the row is already a large tappable
 * card (and an unread one carries a gradient), so a solid button fights it. */
const TEXT_BUTTON = { fontWeight: 800, textTransform: 'none' } as const;

/**
 * The inline actions on a FOLLOW_REQUEST notification, across the whole life of
 * the request:
 *
 *   PENDING   Accept / Deny — accepting is what creates the follow, so these
 *             buttons are the private profile's whole gate.
 *   ACCEPTED  "Accepted", plus Follow Back when the viewer does not already
 *             follow the requester back. Following a private profile only opens
 *             a request, which is why the button can land on "Requested".
 *   DENIED    "Denied", and nothing to act on.
 *
 * Which of those to render is decided by `followRequestRowState` in
 * @duncit/utils so the native twin cannot disagree with it (rules 27, 40).
 */
export default function FollowRequestActions({
  actionType,
  requestId,
  status,
  actorId,
  followBackStatus,
  unreadRow,
  onAnswered,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [accept] = useMutation(ANSWER_FOLLOW_REQUEST);
  const [reject] = useMutation(REJECT_FOLLOW_REQUEST);
  const [followBack] = useMutation(FOLLOW_USER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Self-gating: every notification row renders this, and an ordinary one gets
  // nothing back. That keeps the decision here instead of adding a branch to
  // the row's already-dense render.
  const state = followRequestRowState({ actionType, requestId, status, followBackStatus });
  if (state === 'HIDDEN') return null;

  const run = async (mutate: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await mutate();
      onAnswered();
    } catch (e: any) {
      setError(e?.message ?? 'Could not answer this request');
    } finally {
      setBusy(false);
    }
  };

  const settledLabel = status === 'ACCEPTED' ? t('mweb.follow.accepted') : t('mweb.follow.rejected');

  // Answered elsewhere (another device), denied, or already followed back —
  // state the outcome instead of offering buttons that would now fail.
  if (state === 'SETTLED') {
    return (
      <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>
        {settledLabel}
      </Typography>
    );
  }

  if (state === 'FOLLOW_BACK') {
    // REQUESTED renders the button as a disabled "Requested": the ask is
    // already open, so a second tap has nothing to send.
    const pending = !canFollowBack(followBackStatus);
    return (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mt: 1 }}
        onClick={(event) => event.stopPropagation()}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>
          {settledLabel}
        </Typography>
        <Button
          size="small"
          variant="text"
          disabled={busy || pending || !actorId}
          startIcon={
            busy ? <CircularProgress size={13} color="inherit" /> : <PersonAddAlt1Icon fontSize="small" />
          }
          onClick={() => void run(() => followBack({ variables: { user_id: actorId } }))}
          sx={{ ...TEXT_BUTTON, color: unreadRow ? 'inherit' : 'primary.main' }}
        >
          {t(followBackLabelKey(followBackStatus))}
        </Button>
        {error && (
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {error}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={0.5} sx={{ mt: 1 }} onClick={(event) => event.stopPropagation()}>
      <Stack direction="row" spacing={0.5} sx={{ ml: -0.5 }}>
        <Button
          size="small"
          variant="text"
          disabled={busy}
          startIcon={busy ? <CircularProgress size={13} color="inherit" /> : undefined}
          onClick={() => void run(() => accept({ variables: { request_id: requestId } }))}
          sx={{
            ...TEXT_BUTTON,
            // `inherit` on an unread row: its gradient already sets a light ink,
            // and primary.main on that background is unreadable.
            color: unreadRow ? 'inherit' : 'primary.main',
          }}
        >
          {t('mweb.follow.accept')}
        </Button>
        <Button
          size="small"
          variant="text"
          disabled={busy}
          onClick={() => void run(() => reject({ variables: { request_id: requestId } }))}
          sx={{
            ...TEXT_BUTTON,
            color: unreadRow ? 'inherit' : 'text.secondary',
            opacity: unreadRow ? 0.75 : 1,
          }}
        >
          {t('mweb.follow.reject')}
        </Button>
      </Stack>
      {error && (
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {error}
        </Typography>
      )}
    </Stack>
  );
}
