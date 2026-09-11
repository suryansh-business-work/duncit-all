import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { IconDisc } from './IconDisc';
import type { PendingRequest } from './DeletionRequestPanel';

interface Props {
  pending: PendingRequest;
  cancelling: boolean;
  onWithdraw: () => void;
  /** The panel's error line, if any. */
  errorLine: ReactNode;
}

/** The open deletion request — when it lands, its reference, and the one way
 * back out. Replaces the request row rather than sitting beside it. */
export function DeletionPendingNotice({
  pending,
  cancelling,
  onWithdraw,
  errorLine,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  return (
    <YStack gap={12} testID="deletion-pending">
      <XStack alignItems="flex-start" gap={16}>
        <IconDisc icon="hourglass-top" tone="danger" />
        <YStack flex={1} gap={2}>
          <Text fontSize={15} fontWeight="500" color="$color">
            {t('mweb.account.deletion.pendingTitle')}
          </Text>
          <Text fontSize={14} color="$muted">
            {t('mweb.account.deletion.pendingBody')}
          </Text>
          <Text fontSize={14} fontWeight="600" color="$danger">
            {t('mweb.account.deletion.deletesOn', {
              vars: { date: formatDate(pending.scheduled_delete_at) },
            })}
          </Text>
          <Text fontSize={12} color="$muted">
            {t('mweb.account.deletion.pendingRef', { vars: { code: pending.request_id } })}
            {' · '}
            {t('mweb.account.deletion.pendingOn', {
              vars: { date: formatDate(pending.requested_at) },
            })}
          </Text>
        </YStack>
      </XStack>
      <XStack
        testID="withdraw-deletion"
        role="button"
        aria-label={t('mweb.account.deletion.withdraw')}
        onPress={onWithdraw}
        alignSelf="flex-start"
        height={40}
        alignItems="center"
        paddingHorizontal={16}
        borderRadius={999}
        backgroundColor="$soft"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          {cancelling
            ? t('mweb.account.deletion.withdrawing')
            : t('mweb.account.deletion.withdraw')}
        </Text>
      </XStack>
      {errorLine}
    </YStack>
  );
}
