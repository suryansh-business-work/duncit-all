import { formatMoney } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Role-wise Minimum Withdrawal Amount as sent by the server. 0 = no floor. */
  minAmount: number;
  symbol: string;
  /** The server's `can_withdraw` — never re-derived here. */
  eligible: boolean;
  disabled: boolean;
  onPress: () => void;
}

/**
 * The wallet's Withdraw call to action: the applicable minimum withdrawal
 * amount, and the green pill that is blocked until the server says the balance
 * clears it. mWeb's WalletPage renders the same two states with the same copy
 * (rule 27).
 */
export function WithdrawCta({ minAmount, symbol, eligible, disabled, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const noticeKey = eligible ? 'mweb.wallet.minimumHint' : 'mweb.wallet.minimumBlocked';
  const notice = t(noticeKey, { vars: { amount: formatMoney(minAmount, { symbol }) } });
  const noticeColor = eligible ? '$muted' : '$warning';

  return (
    <YStack gap={6}>
      {minAmount > 0 ? (
        <Text testID="wallet-minimum-notice" fontSize={12} fontWeight="600" color={noticeColor}>
          {notice}
        </Text>
      ) : null}
      <XStack marginTop={12}>
        <DuncitButton
          testID="wallet-withdraw"
          label={t('mweb.wallet.withdraw')}
          size="lg"
          disabled={disabled}
          onPress={onPress}
        />
      </XStack>
    </YStack>
  );
}
