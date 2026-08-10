import { semantic } from '@duncit/auth-tokens';
import { formatMoney } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

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
 * amount, and the button that is blocked until the server says the balance
 * clears it. mWeb's WalletPage renders the same two states with the same copy
 * (rule 27).
 */
export function WithdrawCta({ minAmount, symbol, eligible, disabled, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const noticeKey = eligible ? 'mweb.wallet.minimumHint' : 'mweb.wallet.minimumBlocked';
  const notice = t(noticeKey, { vars: { amount: formatMoney(minAmount, { symbol }) } });
  const noticeColor = eligible ? '$muted' : semantic.warning;

  return (
    <YStack gap={6}>
      {minAmount > 0 ? (
        <Text testID="wallet-minimum-notice" fontSize={11.5} fontWeight="600" color={noticeColor}>
          {notice}
        </Text>
      ) : null}
      <XStack
        testID="wallet-withdraw"
        role="button"
        aria-label="Withdraw"
        aria-disabled={disabled}
        onPress={disabled ? undefined : onPress}
        alignSelf="flex-start"
        marginTop={8}
        paddingHorizontal={18}
        height={42}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$primary"
        opacity={disabled ? 0.5 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          Withdraw
        </Text>
      </XStack>
    </YStack>
  );
}
