import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack } from 'tamagui';
import { canFollowBack, followBackLabelKey, followRequestRowState } from '@duncit/utils';

import {
  MobileAcceptFollowRequestDocument,
  MobileFollowUserDocument,
  MobileRejectFollowRequestDocument,
} from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

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

interface FollowBackRowProps {
  /** Follow Back, or the flat "Requested" when the ask is already open. */
  label: string;
  /** The outcome line above the button; absent on a NEW_FOLLOWER row. */
  settledLabel: string | null;
  pending: boolean;
  /** Both inks are decided by the parent — see the note where they are built. */
  accentInk: string;
  quietInk: string;
  /** Absent when there is nothing left to send, which is what greys the row. */
  onPress?: () => void;
}

/**
 * The Follow Back row.
 *
 * Hoisted rather than written inline (rule 26g): it is the one branch of this
 * component with a layout of its own, and leaving it in place put the whole
 * file over the complexity ceiling. Every colour and label arrives as a prop,
 * so no decision moved down here with it.
 */
function FollowBackRow({
  label,
  settledLabel,
  pending,
  accentInk,
  quietInk,
  onPress,
}: Readonly<FollowBackRowProps>) {
  return (
    <XStack gap={10} paddingTop={10} alignItems="center">
      {settledLabel ? (
        <Text fontSize={12.5} fontWeight="700" color={quietInk}>
          {settledLabel}
        </Text>
      ) : null}
      <XStack
        testID="follow-request-follow-back"
        role="button"
        aria-label={label}
        gap={5}
        alignItems="center"
        opacity={pending ? 0.6 : 1}
        onPress={onPress}
        pressStyle={{ opacity: 0.6 }}
      >
        <MaterialIcons name="person-add-alt-1" size={15} color={accentInk} />
        <Text fontSize={13.5} fontWeight="800" color={accentInk}>
          {label}
        </Text>
      </XStack>
    </XStack>
  );
}

/**
 * The inline actions on an actionable follow notification.
 *
 * On a FOLLOW_REQUEST, across the whole life of the request:
 *
 *   PENDING   Accept / Deny — accepting is what creates the follow, so these
 *             buttons are the private profile's whole gate.
 *   ACCEPTED  "Accepted", plus Follow Back when the viewer does not already
 *             follow the requester back. Following a private profile only opens
 *             a request, which is why the button can land on "Requested".
 *   DENIED    "Denied", and nothing to act on.
 *
 * On a NEW_FOLLOWER there is no request and so no outcome to state: the row
 * carries Follow Back alone, and nothing once the viewer follows them back. It
 * is the only follow row a PUBLIC profile ever gets, so it is the only way
 * most people can follow back from the inbox at all.
 *
 * Which of those to render is decided by `followRequestRowState` in
 * @duncit/utils so the mWeb twin cannot disagree with it (rules 27, 40).
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
  const state = followRequestRowState({ actionType, requestId, status, followBackStatus, actorId });
  if (state === 'HIDDEN') return null;

  const answeredLabel =
    status === 'ACCEPTED' ? t('mweb.follow.accepted') : t('mweb.follow.rejected');
  // A new-follower row has no request behind it, so there is no outcome to
  // state above the button — only a FOLLOW_REQUEST row carries this line.
  const settledLabel = status ? answeredLabel : null;
  // Hoisted to nesting 0 (rule 26g): both inks are the same decision in every
  // branch below, and computing them once keeps them all on one value — and
  // out of a child, where the branch would only run on that child's path and
  // leave the other side uncovered.
  const accentInk = unreadRow ? onPrimary : primary;
  const quietInk = unreadRow ? onPrimary : muted;

  // Answered elsewhere (another device), denied, or already followed back —
  // state the outcome instead of offering buttons that would now fail.
  if (state === 'SETTLED') {
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

  if (busy) return <Spinner testID="follow-request-busy" size="small" color={primary} />;

  if (state === 'FOLLOW_BACK') {
    // REQUESTED renders as a flat "Requested": the ask is already open, so a
    // second tap has nothing to send.
    const pending = !canFollowBack(followBackStatus);
    const sendFollowBack = () =>
      run(() =>
        graphqlRequest(MobileFollowUserDocument, { user_id: actorId as string }, { auth: true }),
      );
    return (
      <FollowBackRow
        label={t(followBackLabelKey(followBackStatus))}
        settledLabel={settledLabel}
        pending={pending}
        accentInk={accentInk}
        quietInk={quietInk}
        onPress={pending || !actorId ? undefined : sendFollowBack}
      />
    );
  }

  // Text buttons, not filled ones: the row is already a large tappable card, so
  // a solid button fights it. Accept leads in the primary colour, Deny sits back
  // in grey. mWeb twin (rule 27).
  return (
    <XStack gap={18} paddingTop={10}>
      <Text
        testID="follow-request-accept"
        role="button"
        aria-label={t('mweb.follow.accept')}
        onPress={() => void answer(true)}
        fontSize={13.5}
        fontWeight="800"
        color={accentInk}
        pressStyle={{ opacity: 0.6 }}
      >
        {t('mweb.follow.accept')}
      </Text>
      <Text
        testID="follow-request-reject"
        role="button"
        aria-label={t('mweb.follow.reject')}
        onPress={() => void answer(false)}
        fontSize={13.5}
        fontWeight="800"
        color={quietInk}
        opacity={unreadRow ? 0.75 : 1}
        pressStyle={{ opacity: 0.6 }}
      >
        {t('mweb.follow.reject')}
      </Text>
    </XStack>
  );
}
