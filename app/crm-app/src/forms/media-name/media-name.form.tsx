import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { MEDIA_NAME_MAX, makeMediaNameSchema, type MediaNameValues } from './media-name.types';

interface Props {
  /** The current name, prefilled. */
  initialName: string;
  busy: boolean;
  /** A save error from the server, shown above the buttons. */
  error?: string | null;
  onSubmit: (values: MediaNameValues) => Promise<void>;
  onCancel: () => void;
}

/** Rename one logo or image — the portal's rename dialog. */
export function MediaNameForm({ initialName, busy, error, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<MediaNameValues>(makeMediaNameSchema(t)), [t]);
  const { control, handleSubmit } = useForm({
    defaultValues: { name: initialName },
    resolver,
    mode: 'onSubmit',
  });
  return (
    <YStack gap="$3">
      <TextField
        control={control}
        name="name"
        label={t('shell.common.name')}
        hint={t('crm.media.nameHint', { vars: { max: MEDIA_NAME_MAX } })}
        testID="media-name-input"
      />
      {error ? (
        <Text color="$danger" role="alert">
          {error}
        </Text>
      ) : null}
      <XStack justifyContent="flex-end" gap="$2">
        <DuncitButton
          label={t('shell.common.cancel')}
          onPress={onCancel}
          variant="ghost"
          disabled={busy}
          testID="media-name-cancel"
        />
        <DuncitButton
          label={t('shell.common.save')}
          onPress={handleSubmit(onSubmit)}
          loading={busy}
          testID="media-name-submit"
        />
      </XStack>
    </YStack>
  );
}
