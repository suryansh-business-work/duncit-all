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
   * buttons take its ink instead of colours that vanish on it. */
  unreadRow?: boolean;
  /** Lets the inbox re-read once the request is answered. */
  onAnswered: () => void;
}

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
  const state = followRequestRowState({ actionType, requestId, status, followBackStatus });
  if (state === 'HIDDEN') return null;

  const settledLabel =
    status === 'ACCEPTED' ? t('mweb.follow.accepted') : t('mweb.follow.rejected');
  // Hoisted to nesting 0 (rule 26g): the accent ink is the same decision in
  // every branch below, and computing it once keeps them all on one value.
  const accentInk = unreadRow ? onPrimary : primary;

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
    const label = t(followBackLabelKey(followBackStatus));
    const sendFollowBack = () =>
      run(() =>
        graphqlRequest(MobileFollowUserDocument, { user_id: actorId as string }, { auth: true }),
      );
    return (
      <XStack gap={10} paddingTop={10} alignItems="center">
        <Text fontSize={12.5} fontWeight="700" color={unreadRow ? onPrimary : muted}>
          {settledLabel}
        </Text>
        <XStack
          testID="follow-request-follow-back"
          role="button"
          aria-label={label}
          gap={5}
          alignItems="center"
          opacity={pending ? 0.6 : 1}
          onPress={pending || !actorId ? undefined : sendFollowBack}
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
        color={unreadRow ? onPrimary : muted}
        opacity={unreadRow ? 0.75 : 1}
        pressStyle={{ opacity: 0.6 }}
      >
        {t('mweb.follow.reject')}
      </Text>
    </XStack>
  );
}
