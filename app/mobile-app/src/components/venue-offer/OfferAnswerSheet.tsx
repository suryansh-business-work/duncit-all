import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import {
  makeVenueOfferRejectSchema,
  venueOfferRejectDefaults,
  type VenueOfferRejectValues,
} from '@duncit/forms/schemas';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';
import type { AnswerChoice, AnswerCopy } from './answer-copy';

interface Props {
  /** The answer being confirmed. Mounted per answer, so every one starts blank. */
  choice: AnswerChoice;
  /** The sheet's words for that answer (`offerAnswerCopy`). */
  copy: AnswerCopy;
  busy: boolean;
  /** Why the server refused the answer; the sheet stays open to show it. */
  error: string | null;
  onClose: () => void;
  /** The reason typed (always '' for an accept). */
  onConfirm: (reason: string) => void;
}

/**
 * Accept — one confirmation naming exactly what goes live — or reject, with an
 * optional reason for the other side (`makeVenueOfferRejectSchema`, the same
 * rule the web reads). The app's own sheet, never the platform alert (rule 28).
 * mWeb twin: AnswerOfferDialog.
 */
export function OfferAnswerSheet({
  choice,
  copy,
  busy,
  error,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const accept = choice === 'accept';
  const schema = useMemo(() => makeVenueOfferRejectSchema(t), [t]);
  const { control, handleSubmit } = useForm<
    VenueOfferRejectValues,
    unknown,
    VenueOfferRejectValues
  >({
    resolver: formResolver<VenueOfferRejectValues>(schema),
    defaultValues: venueOfferRejectDefaults,
  });
  const submit = handleSubmit((values) => onConfirm(accept ? '' : values.reason.trim()));

  return (
    <DuncitDialog
      open
      onClose={onClose}
      testID="offer-answer-sheet"
      title={copy.title}
      closeLabel={t('availability.offers.cancel')}
      variant="center"
      dismissOnBackdrop={!busy}
      showCloseButton={false}
      footer={
        <ConfirmFooter
          cancelLabel={t('availability.offers.cancel')}
          confirmLabel={accept ? t('availability.offers.accept') : t('availability.offers.reject')}
          busy={busy}
          destructive={!accept}
          cancelTestID="offer-answer-cancel"
          confirmTestID="offer-answer-confirm"
          onCancel={onClose}
          onConfirm={() => fireAndForget(submit())}
        />
      }
    >
      <YStack gap={12}>
        {error ? (
          <Text testID="offer-answer-error" role="alert" fontSize={13} color="$danger">
            {error}
          </Text>
        ) : null}
        <Text fontSize={14} color="$muted">
          {copy.message}
        </Text>
        {accept ? null : (
          <FormTextField
            control={control}
            name="reason"
            label={copy.reasonLabel}
            multiline
            numberOfLines={3}
          />
        )}
      </YStack>
    </DuncitDialog>
  );
}
