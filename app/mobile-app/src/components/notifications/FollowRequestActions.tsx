import { useState } from 'react';
import { Spinner, Text, XStack } from 'tamagui';

import {
  MobileAcceptFollowRequestDocument,
  MobileRejectFollowRequestDocument,
} from '@/graphql/hosts-venues';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The notification's action kind — anything but FOLLOW_REQUEST renders nothing. */
  actionType?: string | null;
  requestId?: string | null;
  /** Live status of the request — PENDING is the only state with buttons. */
  status?: string | null;
  /** The row is unread, so it is painted with the primary gradient — the text
   * buttons take its ink instead of colours that vanish on it. */
  unreadRow?: boolean;
  /** Lets the inbox re-read once the request is answered. */
  onAnswered: () => void;
}

/** Accept / Reject on a FOLLOW_REQUEST notification. Accepting is what creates
 * the follow, so these buttons are the private profile's whole gate. Tamagui
 * twin of mWeb's <FollowRequestActions/> (rule 27). */
export function FollowRequestActions({
  actionType,
  requestId,
  status,
  unreadRow,
  onAnswered,
}: Readonly<Props>) {
  const { muted, onPrimary, primary } = useThemeColors();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  // Self-gating: every notification row renders this, and an ordinary one gets
  // nothing back. That keeps the decision here instead of adding a branch to
  // the row's already-dense render.
  if (actionType !== 'FOLLOW_REQUEST' || !requestId) return null;

  // Answered elsewhere (another device, or the requester withdrew) — show the
  // outcome instead of buttons that would now fail.
  if (status && status !== 'PENDING') {
    const settled = status === 'ACCEPTED' ? t('mweb.follow.accepted') : t('mweb.follow.rejected');
    return (
      <Text testID="follow-request-settled" fontSize={12.5} fontWeight="700" color="$muted">
        {settled}
      </Text>
    );
  }

  const answer = async (accept: boolean) => {
    setBusy(true);
    try {
      await graphqlRequest(
        accept ? MobileAcceptFollowRequestDocument : MobileRejectFollowRequestDocument,
        { request_id: requestId },
        { auth: true },
      );
      onAnswered();
    } catch {
      // The row stays actionable so the host can simply try again.
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Spinner testID="follow-request-busy" size="small" color={primary} />;

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
        color={unreadRow ? onPrimary : primary}
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
