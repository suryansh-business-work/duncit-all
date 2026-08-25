import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import { canFollowBack, followBackLabelKey, followRequestRowState, offersFollowBack } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import {
  ANSWER_FOLLOW_REQUEST,
  FOLLOW_USER,
  REJECT_FOLLOW_REQUEST,
} from '../../../../pages/hosts-venues-page/queries';
import { AnswerButtons, FollowBackButton } from './FollowActionButtons';

interface Props {
  /** The notification's action kind — FOLLOW_REQUEST or NEW_FOLLOWER; anything
   * else renders nothing. */
  actionType?: string | null;
  requestId?: string | null;
  /** Live status of the request — PENDING is the only state with Accept/Deny.
   * Always null on a NEW_FOLLOWER row: there is no request behind it. */
  status?: string | null;
  /** The other user, i.e. who a Follow Back would follow. */
  actorId?: string | null;
  /** The viewer's own follow state towards that user. FOLLOWING is what
   * hides Follow Back — they are already followed, so there is nothing to do. */
  followBackStatus?: string | null;
  /** The row is unread, so it is painted with the primary gradient — the text
   * buttons inherit its ink instead of using palette colours that vanish on it. */
  unreadRow?: boolean;
  /** Lets the inbox re-read counts/rows once the request is answered. */
  onAnswered: () => void;
}

/**
 * The inline actions on an actionable follow notification.
 *
 * On a FOLLOW_REQUEST, across the whole life of the request:
 *
 *   PENDING   Accept / Deny, AND Follow Back. The two follow directions are
 *             independent edges, so following them back does not answer their
 *             ask and does not wait on it — somebody asking to follow you is
 *             exactly the moment you may want to follow them.
 *   ACCEPTED  "Accepted", plus Follow Back when the viewer does not already
 *             follow the requester back. Following a private profile only opens
 *             a request, which is why the button can land on "Requested".
 *   DENIED    "Denied", and Follow Back on the same terms. Denying their ask
 *             says nothing about whether you want to follow them.
 *
 * On a NEW_FOLLOWER there is no request and so no outcome to state: the row
 * carries Follow Back alone, and nothing once the viewer follows them back. It
 * is the only follow row a PUBLIC profile ever gets, so it is the only way
 * most people can follow back from the inbox at all.
 *
 * Which of those to render is decided by `followRequestRowState` and
 * `offersFollowBack` in @duncit/utils so the native twin cannot disagree with
 * it (rules 27, 40).
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
  // Which action is in flight, not merely THAT one is: the pending row can
  // offer three buttons, and only the tapped one should wear the spinner.
  const [inFlight, setInFlight] = useState<'answer' | 'followBack' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Self-gating: every notification row renders this, and an ordinary one gets
  // nothing back. That keeps the decision here instead of adding a branch to
  // the row's already-dense render.
  const row = { actionType, requestId, status, followBackStatus, actorId };
  const state = followRequestRowState(row);
  if (state === 'HIDDEN') return null;

  const busy = inFlight !== null;

  const run = async (kind: 'answer' | 'followBack', mutate: () => Promise<unknown>) => {
    setInFlight(kind);
    setError(null);
    try {
      await mutate();
      onAnswered();
    } catch (e: any) {
      setError(e?.message ?? 'Could not answer this request');
    } finally {
      setInFlight(null);
    }
  };

  const answeredLabel = status === 'ACCEPTED' ? t('mweb.follow.accepted') : t('mweb.follow.rejected');
  // A new-follower row has no request behind it, so there is no outcome to
  // state beside the button — only a FOLLOW_REQUEST row carries this line.
  const settledLabel = status ? answeredLabel : null;

  const followBackOffered = offersFollowBack(row);

  // Answered elsewhere (another device) and nothing left to do — state the
  // outcome instead of offering buttons that would now fail. A settled row that
  // can still be followed back keeps its outcome line AND the button below.
  if (state === 'SETTLED' && !followBackOffered) {
    return (
      <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>
        {settledLabel}
      </Typography>
    );
  }

  // `inherit` on an unread row: its gradient already sets a light ink, and
  // primary.main on that background is unreadable.
  const accentInk = unreadRow ? 'inherit' : 'primary.main';
  const quietInk = unreadRow ? 'inherit' : 'text.secondary';
  const open = state === 'ANSWER';
  // The negative margin pulls the leading BUTTON's own padding back so its text
  // lines up with the row above; a leading caption needs no such correction.
  const leadIn = open ? -0.5 : 0;

  return (
    <Stack spacing={0.5} sx={{ mt: 1 }} onClick={(event) => event.stopPropagation()}>
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap', ml: leadIn }}
      >
        {open && (
          <AnswerButtons
            accentInk={accentInk}
            quietInk={quietInk}
            dimQuiet={Boolean(unreadRow)}
            busy={busy}
            spinning={inFlight === 'answer'}
            acceptLabel={t('mweb.follow.accept')}
            denyLabel={t('mweb.follow.reject')}
            onAccept={() => void run('answer', () => accept({ variables: { request_id: requestId } }))}
            onDeny={() => void run('answer', () => reject({ variables: { request_id: requestId } }))}
          />
        )}
        {!open && settledLabel && (
          <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>
            {settledLabel}
          </Typography>
        )}
        {followBackOffered && (
          <FollowBackButton
            accentInk={accentInk}
            busy={busy}
            spinning={inFlight === 'followBack'}
            pending={!canFollowBack(followBackStatus)}
            label={t(followBackLabelKey(followBackStatus))}
            onFollowBack={() => void run('followBack', () => followBack({ variables: { user_id: actorId } }))}
          />
        )}
      </Stack>
      {error && (
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {error}
        </Typography>
      )}
    </Stack>
  );
}
