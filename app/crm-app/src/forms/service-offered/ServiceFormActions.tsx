import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  submitLabel: string;
  /** Held off until the form is complete, as the portal's dialog button is. */
  disabled: boolean;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  testID: string;
}

/** The dialog's Cancel and submit buttons, side by side under the form. */
export function ServiceFormActions({
  submitLabel,
  disabled,
  busy,
  onSubmit,
  onCancel,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <XStack gap="$2">
      <YStack flex={1}>
        <DuncitButton
          label={t('shell.common.cancel')}
          onPress={onCancel}
          variant="outline"
          disabled={busy}
          fullWidth
          testID={`${testID}-cancel`}
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          label={submitLabel}
          onPress={onSubmit}
          disabled={disabled}
          loading={busy}
          fullWidth
          testID={`${testID}-submit`}
        />
      </YStack>
    </XStack>
  );
}
