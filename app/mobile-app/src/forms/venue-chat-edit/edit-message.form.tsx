import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { makeVenueChatEditSchema, type VenueChatEditValues } from '@duncit/forms/schemas';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  /** The line's words as they stand — the field starts from them. */
  text: string;
  busy: boolean;
  /** Why the server refused the edit; the dialog stays open to show it. */
  error: string | null;
  onClose: () => void;
  onSave: (text: string) => void;
}

/**
 * Rewriting one's own venue chat line: the words as they stand, edited in
 * place, saved only when something is left to say within the server's bound —
 * one rule with mWeb and the Partners app (`makeVenueChatEditSchema`). Both
 * sides then see the line marked edited. mWeb twin: VenueChatEditDialog.
 */
export function VenueChatEditForm({ text, busy, error, onClose, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueChatEditSchema(t), [t]);
  const { control, handleSubmit } = useForm<VenueChatEditValues, unknown, VenueChatEditValues>({
    resolver: formResolver<VenueChatEditValues>(schema),
    defaultValues: { text },
  });
  const save = handleSubmit((values) => onSave(values.text.trim()));

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="venue-chat-edit-cancel"
          label={t('availability.offers.cancel')}
          onPress={onClose}
          variant="ghost"
          tone="neutral"
          disabled={busy}
          fullWidth
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="venue-chat-edit-save"
          label={t('availability.offers.chat.save')}
          onPress={() => fireAndForget(save())}
          loading={busy}
          disabled={busy}
          fullWidth
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open
      onClose={onClose}
      testID="venue-chat-edit"
      title={t('availability.offers.chat.editTitle')}
      closeLabel={t('availability.offers.chat.close')}
      dismissOnBackdrop={!busy}
      footer={footer}
    >
      <YStack gap={12}>
        {error ? (
          <Text testID="venue-chat-edit-error" role="alert" fontSize={13} color="$danger">
            {error}
          </Text>
        ) : null}
        <FormTextField
          control={control}
          name="text"
          label={t('mweb.chatRoom.editMessage')}
          multiline
          numberOfLines={4}
        />
      </YStack>
    </DuncitDialog>
  );
}
