import { useState } from 'react';
import { Spinner, Text, XStack } from 'tamagui';
import {
  canFollowBack,
  followBackLabelKey,
  followOutcomeLabelKey,
  followRequestRowState,
  offersFollowBack,
} from '@duncit/utils';

import {
  MobileAcceptFollowRequestDocument,
  MobileFollowUserDocument,
  MobileRejectFollowRequestDocument,
} from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AnswerActions, FollowBackAction } from './FollowActionRows';

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
   * buttons take its ink instead of colours that vanish on it. */
  unreadRow?: boolean;
  /** Lets the inbox re-read once the request is answered. */
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
 * `offersFollowBack` in @duncit/utils so the mWeb twin cannot disagree with it
 * (rules 27, 40).
 */
export function FollowRequestActions({
  actionType,
  requestId,
  status,
  actorId,
  followBackStatus,
  unreadRow,
  onAnswered,
}: Readonly<Props>) {
  const { muted, onPrimary, primary } = useThemeColors();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  // Self-gating: every notification row renders this, and an ordinary one gets
  // nothing back. That keeps the decision here instead of adding a branch to
  // the row's already-dense render.
  const row = { actionType, requestId, status, followBackStatus, actorId };
  const state = followRequestRowState(row);
  if (state === 'HIDDEN') return null;

  // "Accepted" / "Denied" on an answered FOLLOW_REQUEST row; nothing on a
  // NEW_FOLLOWER row (no request behind it) or a withdrawn one (going away).
  const outcomeKey = followOutcomeLabelKey(status);
  const settledLabel = outcomeKey ? t(outcomeKey) : null;
  // Hoisted to nesting 0 (rule 26g): both inks are the same decision in every
  // branch below, and computing them once keeps them all on one value — and
  // out of a child, where the branch would only run on that child's path and
  // leave the other side uncovered.
  const accentInk = unreadRow ? onPrimary : primary;
  const quietInk = unreadRow ? onPrimary : muted;

  const followBackOffered = offersFollowBack(row);

  // Answered elsewhere (another device) and nothing left to do — state the
  // outcome instead of offering buttons that would now fail. A settled row that
  // can still be followed back keeps its outcome line AND the button beside it.
  if (state === 'SETTLED' && !followBackOffered) {
    return (
      <Text testID="follow-request-settled" fontSize={12.5} fontWeight="700" color="$muted">
        {settledLabel}
      </Text>
    );
  }

  const run = async (send: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await send();
      onAnswered();
    } catch {
      // The row stays actionable so the user can simply try again.
    } finally {
      setBusy(false);
    }
  };

  const answer = (accept: boolean) =>
    run(() =>
      graphqlRequest(
        accept ? MobileAcceptFollowRequestDocument : MobileRejectFollowRequestDocument,
        { request_id: requestId as string },
        { auth: true },
      ),
    );

  const sendFollowBack = () =>
    run(() =>
      graphqlRequest(MobileFollowUserDocument, { user_id: actorId as string }, { auth: true }),
    );

  if (busy) return <Spinner testID="follow-request-busy" size="small" color={primary} />;

  const open = state === 'ANSWER';
  // REQUESTED renders flat and untappable: the ask is already open, so a second
  // tap has nothing to send.
  const askPending = !canFollowBack(followBackStatus);

  return (
    <XStack gap={16} paddingTop={10} alignItems="center" flexWrap="wrap">
      {open ? (
        <AnswerActions
          acceptLabel={t('mweb.follow.accept')}
          denyLabel={t('mweb.follow.reject')}
          accentInk={accentInk}
          quietInk={quietInk}
          dimQuiet={Boolean(unreadRow)}
          onAccept={() => void answer(true)}
          onDeny={() => void answer(false)}
        />
      ) : null}
      {!open && settledLabel ? (
        <Text fontSize={12.5} fontWeight="700" color={quietInk}>
          {settledLabel}
        </Text>
      ) : null}
      {followBackOffered ? (
        <FollowBackAction
          label={t(followBackLabelKey(followBackStatus))}
          pending={askPending}
          accentInk={accentInk}
          onPress={askPending ? undefined : sendFollowBack}
        />
      ) : null}
    </XStack>
  );
}
