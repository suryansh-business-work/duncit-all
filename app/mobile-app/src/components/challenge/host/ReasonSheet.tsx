import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { makeReasonSchema, type ReasonValues } from '@/forms/challenge';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  required: boolean;
  busy: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

/** A confirmation that also asks why — for score removals and result corrections (kept in the audit trail). */
export function ReasonSheet({
  open,
  title,
  message,
  confirmLabel,
  required,
  busy,
  onSubmit,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<ReasonValues, unknown, ReasonValues>({
    resolver: formResolver<ReasonValues>(makeReasonSchema(t, required)),
    defaultValues: { reason: '' },
  });
  useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);
  const submit = handleSubmit((values) => onSubmit(values.reason.trim()));

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="challenge-reason-dialog"
      title={title}
      closeLabel={t('mweb.challenge.cancel')}
      dismissOnBackdrop={!busy}
      showCloseButton={false}
      footer={
        <ConfirmFooter
          cancelLabel={t('mweb.challenge.cancel')}
          confirmLabel={confirmLabel}
          busy={busy}
          destructive
          cancelTestID="challenge-reason-cancel"
          confirmTestID="challenge-reason-confirm"
          onCancel={onClose}
          onConfirm={() => {
            submit().catch(() => undefined);
          }}
        />
      }
    >
      <YStack gap={12}>
        <Text fontSize={14} color="$muted">
          {message}
        </Text>
        <FormTextField
          control={control}
          name="reason"
          label={t('mweb.challenge.fields.reason')}
          required={required}
          multiline
          numberOfLines={3}
        />
      </YStack>
    </DuncitDialog>
  );
}
