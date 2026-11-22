import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { makeRentalProofSchema, type RentalProofFormValues } from '@duncit/forms/schemas';
import { RENTAL_PROOF_IMAGES_MAX, type RentalProofValues } from '@duncit/utils';

import { MediaUploadField } from '@/components/create-pod/MediaUploadField/MediaUploadField';
import { splitLines } from '@/components/create-pod/MediaUploadField/mediaUploadHelpers';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';
import { formResolver } from '@/utils/form-resolver';

/** Where proof photos are filed: the venue's media folder, as the item photos are. */
const PROOF_PHOTO_FOLDER = '/venues';

const DEFAULTS: RentalProofFormValues = { note: '', image_urls: [] };

interface Props {
  /** The item's name, for the title. */
  name: string;
  onClose: () => void;
  onSave: (input: RentalProofValues) => Promise<void>;
}

/**
 * The venue's optional proof on a rental: a note, photos taken on the device,
 * or both. The rule is @duncit/forms' (the web dialog binds the same one) and
 * the server checks it again.
 */
export function RentalProofSheet({ name, onClose, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => makeRentalProofSchema(t), [t]);
  const { control, handleSubmit } = useForm<RentalProofFormValues>({
    resolver: formResolver<RentalProofFormValues>(schema),
    defaultValues: DEFAULTS,
  });

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await onSave({ note: values.note.trim(), image_urls: values.image_urls });
      onClose();
    } catch (e) {
      // The refusal stays in the sheet with what was typed.
      setError(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  return (
    <DuncitDialog
      open
      onClose={busy ? () => undefined : onClose}
      testID="rental-proof-sheet"
      title={t('venueRentals.proof.title', { vars: { name } })}
      closeLabel={t('venueRentals.proof.cancel')}
      dismissOnBackdrop={false}
      showCloseButton={!busy}
      footer={
        <ConfirmFooter
          cancelLabel={t('venueRentals.proof.cancel')}
          confirmLabel={t('venueRentals.proof.save')}
          busy={busy}
          destructive={false}
          cancelTestID="rental-proof-cancel"
          confirmTestID="rental-proof-save"
          onCancel={onClose}
          onConfirm={() => {
            submit().catch((e: unknown) => setError(toErrorMessage(e)));
          }}
        />
      }
    >
      <YStack gap={12}>
        <FormTextField
          control={control}
          name="note"
          label={t('venueRentals.proof.note')}
          hint={t('venueRentals.proof.noteHint')}
          multiline
        />
        <Controller
          control={control}
          name="image_urls"
          render={({ field, fieldState }) => (
            <YStack gap={4}>
              <MediaUploadField
                label={t('venueRentals.proof.photos')}
                value={field.value.join('\n')}
                onChange={(text) => field.onChange(splitLines(text))}
                error={fieldState.error?.message}
                folder={PROOF_PHOTO_FOLDER}
                maxImages={RENTAL_PROOF_IMAGES_MAX}
                pickerTitle={t('venueRentals.proof.photos')}
                deviceOnly
              />
              <Text fontSize={12} color="$muted">
                {t('venueRentals.proof.photosHint', { vars: { max: RENTAL_PROOF_IMAGES_MAX } })}
              </Text>
            </YStack>
          )}
        />
        {error ? (
          <Text role="alert" testID="rental-proof-error" fontSize={12.5} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
