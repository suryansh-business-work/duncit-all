import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  ANSWER_FOLLOW_REQUEST,
  REJECT_FOLLOW_REQUEST,
} from '../../../pages/hosts-venues-page/queries';

interface Props {
  /** The notification's action kind — anything but FOLLOW_REQUEST renders nothing. */
  actionType?: string | null;
  requestId?: string | null;
  /** Live status of the request — PENDING is the only state with buttons. */
  status?: string | null;
  /** The row is unread, so it is painted with the primary gradient — the text
   * buttons inherit its ink instead of using palette colours that vanish on it. */
  unreadRow?: boolean;
  /** Lets the inbox re-read counts/rows once the request is answered. */
  onAnswered: () => void;
}

/** Accept / Reject on a FOLLOW_REQUEST notification. Accepting is what creates
 * the follow, so these buttons are the private profile's whole gate. Twin of
 * native's <FollowRequestActions/> (rule 27). */
export default function FollowRequestActions({
  actionType,
  requestId,
  status,
  unreadRow,
  onAnswered,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [accept] = useMutation(ANSWER_FOLLOW_REQUEST);
  const [reject] = useMutation(REJECT_FOLLOW_REQUEST);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Self-gating: every notification row renders this, and an ordinary one gets
  // nothing back. That keeps the decision here instead of adding a branch to
  // the row's already-dense render.
  if (actionType !== 'FOLLOW_REQUEST' || !requestId) return null;

  // Answered elsewhere (another device, or the requester withdrew) — show the
  // outcome instead of buttons that would now fail.
  if (status && status !== 'PENDING') {
    const settled = status === 'ACCEPTED' ? t('mweb.follow.accepted') : t('mweb.follow.rejected');
    return (
      <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>
        {settled}
      </Typography>
    );
  }

  const answer = async (run: typeof accept) => {
    setBusy(true);
    setError(null);
    try {
      await run({ variables: { request_id: requestId } });
      onAnswered();
    } catch (e: any) {
      setError(e?.message ?? 'Could not answer this request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={0.5} sx={{ mt: 1 }} onClick={(event) => event.stopPropagation()}>
      {/* Text buttons, not filled ones: the row is already a large tappable
          card (and an unread one carries a gradient), so a solid button fights
          it. Accept leads in the primary colour, Deny sits back in grey. */}
      <Stack direction="row" spacing={0.5} sx={{ ml: -0.5 }}>
        <Button
          size="small"
          variant="text"
          disabled={busy}
          startIcon={busy ? <CircularProgress size={13} color="inherit" /> : undefined}
          onClick={() => void answer(accept)}
          sx={{
            fontWeight: 800,
            textTransform: 'none',
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
          onClick={() => void answer(reject)}
          sx={{
            fontWeight: 800,
            textTransform: 'none',
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
