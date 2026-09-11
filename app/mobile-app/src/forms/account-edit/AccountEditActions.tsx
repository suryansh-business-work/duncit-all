import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  loading?: boolean;
  /** Whether there is anything to discard. */
  canDiscard: boolean;
  /** Whether the form is valid, changed and unblocked. */
  canSave: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/**
 * The foot of the edit-profile form: a soft Discard beside the green Save
 * pill. mWeb twin: pages/account-page/account-edit/AccountEditActions.
 */
export function AccountEditActions({
  loading = false,
  canDiscard,
  canSave,
  onDiscard,
  onSave,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <XStack gap={8} paddingTop={4}>
      <YStack flex={1}>
        <DuncitButton
          testID="account-edit-discard"
          label={t('mweb.accountEdit.discardChanges')}
          variant="soft"
          tone="neutral"
          size="lg"
          fullWidth
          disabled={loading || !canDiscard}
          onPress={onDiscard}
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="account-edit-submit"
          label={loading ? 'Saving…' : 'Save'}
          size="lg"
          fullWidth
          loading={loading}
          disabled={loading || !canSave}
          onPress={onSave}
        />
      </YStack>
    </XStack>
  );
}
