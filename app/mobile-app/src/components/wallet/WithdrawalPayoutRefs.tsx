import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { logs } from '@duncit/logs';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

type CopyState = 'idle' | 'copied' | 'failed';

/** What a reference line says after a copy — literal keys (rule 38). */
const COPY_STATE_KEY: Record<Exclude<CopyState, 'idle'>, string> = {
  copied: 'withdraw.history.copied',
  failed: 'withdraw.history.copyFailed',
};

interface RefLineProps {
  text: string;
  value: string;
  copyLabel: string;
  testID: string;
}

/** One payout reference: its words (selectable), a copy button, and whether the copy landed. */
function RefLine({ text, value, copyLabel, testID }: Readonly<RefLineProps>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [state, setState] = useState<CopyState>('idle');

  const copy = () => {
    Clipboard.setStringAsync(value)
      .then((ok) => setState(ok ? 'copied' : 'failed'))
      .catch((error: unknown) => {
        logs.mobileApp.warn('WalletScreen', 'copyWithdrawalReference', { error });
        setState('failed');
      });
  };

  return (
    <XStack alignItems="center" gap={6} testID={testID}>
      <Text selectable flexShrink={1} fontSize={12} color="$muted">
        {text}
      </Text>
      <XStack
        pressStyle={PRESS_STYLE.control}
        testID={`${testID}-copy`}
        role="button"
        tabIndex={0}
        aria-label={copyLabel}
        hitSlop={11}
        padding={4}
        borderRadius={999}
        onPress={copy}
      >
        <MaterialIcons name="content-copy" size={16} color={muted} />
      </XStack>
      {state === 'idle' ? null : (
        <Text
          testID={`${testID}-status`}
          aria-live="polite"
          fontSize={11}
          color={state === 'copied' ? '$success' : '$danger'}
        >
          {t(COPY_STATE_KEY[state])}
        </Text>
      )}
    </XStack>
  );
}

interface Props {
  /** RazorpayX's payout id — empty until the payout has been sent. */
  paymentId?: string | null;
  /** The bank's reference (UTR) — empty until the bank has confirmed the payment. */
  utr?: string | null;
  /** The row's testID; each line extends it. */
  testID: string;
}

/**
 * A withdrawal's payout references, once Razorpay has them: the payment id and
 * the bank reference a person quotes to their bank when the money has not
 * arrived. Each is selectable and copyable. Twin of mWeb's WithdrawalPayoutRefs
 * (rule 27).
 */
export function WithdrawalPayoutRefs({ paymentId, utr, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!paymentId && !utr) return null;
  return (
    <YStack gap={2} marginTop={2}>
      {paymentId ? (
        <RefLine
          text={t('withdraw.history.paymentId', { vars: { id: paymentId } })}
          value={paymentId}
          copyLabel={t('withdraw.history.copyPaymentId')}
          testID={`${testID}-payment-id`}
        />
      ) : null}
      {utr ? (
        <RefLine
          text={t('withdraw.history.utr', { vars: { utr } })}
          value={utr}
          copyLabel={t('withdraw.history.copyUtr')}
          testID={`${testID}-utr`}
        />
      ) : null}
    </YStack>
  );
}
