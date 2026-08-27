import { Text, XStack, YStack } from 'tamagui';
import { PAYMENT_FAILURE_KEYS, type PaymentFailure } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  failure: PaymentFailure | null;
  ticketNo: string | null;
  ticketPending: boolean;
  ticketFailed: boolean;
  onRetry: () => void;
  onClose: () => void;
}

/**
 * Why the payment did not go through, said properly.
 *
 * The twin of mWeb's dialog (rule 27): same three outcomes, same words, from
 * the shared bundle. A timeout gets the reassurance and the ticket number; a
 * cancellation gets neither, because nothing happened to anybody's money and a
 * case file would be noise.
 */
export function PaymentFailureDialog({
  failure,
  ticketNo,
  ticketPending,
  ticketFailed,
  onRetry,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!failure) return null;

  const keys = PAYMENT_FAILURE_KEYS[failure.kind];
  const moneyAtRisk = failure.raisesTicket;

  return (
    <YStack
      testID="payment-failure-dialog"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={300}
      backgroundColor="rgba(0,0,0,0.55)"
      alignItems="center"
      justifyContent="center"
      padding={24}
    >
      <YStack
        width="100%"
        maxWidth={360}
        gap={12}
        padding={20}
        borderRadius={16}
        backgroundColor="$background"
      >
        <Text fontSize={16} fontWeight="700" color="$color">
          {t(keys.title)}
        </Text>
        <Text fontSize={13} color="$color">
          {t(keys.body)}
        </Text>

        {/* The gateway's own words, never ours — a buyer ringing their bank
            needs the reason the bank will recognise. */}
        {failure.description ? (
          <Text fontSize={11} color="$muted">
            {t('mweb.payment.gatewaySaid', { vars: { reason: failure.description } })}
          </Text>
        ) : null}

        {moneyAtRisk ? (
          <YStack gap={4} padding={12} borderRadius={12} backgroundColor="$surface">
            <Text fontSize={13} fontWeight="600" color="$color">
              {t('mweb.payment.moneySafe')}
            </Text>
            {ticketPending ? (
              <Text fontSize={11} color="$muted">
                {t('mweb.payment.ticketPending')}
              </Text>
            ) : null}
            {ticketNo ? (
              <Text testID="payment-ticket-no" fontSize={13} color="$color">
                {t('mweb.payment.ticketRaised', { vars: { ticket: ticketNo } })}
              </Text>
            ) : null}
            {ticketFailed ? (
              <Text fontSize={11} color="$muted">
                {t('mweb.payment.ticketFailed')}
              </Text>
            ) : null}
          </YStack>
        ) : null}

        <XStack gap={8} justifyContent="flex-end">
          <XStack
            pressStyle={PRESS_STYLE.control}
            testID="payment-failure-close"
            role="button"
            aria-label={t('mweb.payment.close')}
            onPress={onClose}
            height={42}
            paddingHorizontal={18}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Text fontSize={14} fontWeight="600" color="$color">
              {t('mweb.payment.close')}
            </Text>
          </XStack>
          <XStack
            pressStyle={PRESS_STYLE.control}
            testID="payment-failure-retry"
            role="button"
            aria-label={t('mweb.payment.retry')}
            onPress={onRetry}
            height={42}
            paddingHorizontal={18}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            backgroundColor="$primary"
          >
            <Text fontSize={14} fontWeight="600" color="$onPrimary">
              {t('mweb.payment.retry')}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
}
