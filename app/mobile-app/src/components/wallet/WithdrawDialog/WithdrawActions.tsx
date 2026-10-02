import { Spinner, Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface WithdrawActionsProps {
  busy: boolean;
  onPrimary: string;
  onDismiss: (() => void) | undefined;
  onSubmit: () => void;
}

/** Cancel / Request — both inert while the request is in flight. */
export function WithdrawActions({
  busy,
  onPrimary,
  onDismiss,
  onSubmit,
}: Readonly<WithdrawActionsProps>) {
  const { t } = useTranslation();
  return (
    <XStack gap={12} paddingTop={12}>
      <XStack
        testID="withdraw-cancel"
        role="button"
        aria-label={t('mweb.common.cancel')}
        aria-disabled={busy}
        tabIndex={0}
        onPress={onDismiss}
        flex={1}
        height={48}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={busy ? 0.6 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          Cancel
        </Text>
      </XStack>
      <XStack
        testID="withdraw-submit"
        role="button"
        aria-label={t('mweb.wallet.requestWithdrawal')}
        aria-disabled={busy}
        aria-busy={busy}
        tabIndex={0}
        onPress={busy ? undefined : onSubmit}
        flex={1}
        height={48}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={999}
        backgroundColor="$primary"
        opacity={busy ? 0.7 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        {busy ? <Spinner size="small" color={onPrimary} /> : null}
        <Text fontSize={14} fontWeight="600" color="$onPrimary">
          {busy ? 'Requesting…' : 'Request'}
        </Text>
      </XStack>
    </XStack>
  );
}
