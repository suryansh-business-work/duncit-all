import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
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
  onAnswered,
}: Readonly<Props>) {
  const { color: ink, onPrimary, primary } = useThemeColors();
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

  return (
    <XStack gap={8} paddingTop={8}>
      <XStack
        testID="follow-request-accept"
        role="button"
        aria-label={t('mweb.follow.accept')}
        onPress={() => void answer(true)}
        alignItems="center"
        gap={6}
        paddingHorizontal={14}
        paddingVertical={7}
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="check" size={15} color={onPrimary} />
        <Text fontSize={13} fontWeight="700" color={onPrimary}>
          {t('mweb.follow.accept')}
        </Text>
      </XStack>
      <XStack
        testID="follow-request-reject"
        role="button"
        aria-label={t('mweb.follow.reject')}
        onPress={() => void answer(false)}
        alignItems="center"
        gap={6}
        paddingHorizontal={14}
        paddingVertical={7}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="close" size={15} color={ink} />
        <Text fontSize={13} fontWeight="700" color="$color">
          {t('mweb.follow.reject')}
        </Text>
      </XStack>
    </XStack>
  );
}
