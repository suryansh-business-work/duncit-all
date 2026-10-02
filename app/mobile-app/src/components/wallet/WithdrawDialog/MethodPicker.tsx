import { Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { WithdrawMethod } from '../withdraw.form';

const METHODS: WithdrawMethod[] = ['UPI', 'IMPS', 'NEFT'];

/** UPI / IMPS / NEFT — the payout rail the withdrawal goes out on. */
export function MethodPicker({
  method,
  onPick,
}: Readonly<{ method: WithdrawMethod; onPick: (method: WithdrawMethod) => void }>) {
  const { t } = useTranslation();
  return (
    <XStack gap={8} role="radiogroup" aria-label={t('mweb.wallet.payoutMethod')}>
      {METHODS.map((m) => (
        <XStack
          key={m}
          testID={`withdraw-method-${m}`}
          role="radio"
          aria-label={`Pay via ${m}`}
          aria-checked={method === m}
          tabIndex={0}
          onPress={() => onPick(m)}
          flex={1}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor={method === m ? '$primary' : '$soft'}
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={13} fontWeight="600" color={method === m ? '$onPrimary' : '$color'}>
            {m}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}
