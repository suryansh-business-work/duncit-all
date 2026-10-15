import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';
import {
  EVENT_REQUEST_NOTE_MAX,
  eventRequestDefaults,
  makeEventRequestSchema,
  type EventRequestValues,
  type RequestEventSheetProps,
} from './request-event.types';

/** "Request an event": an optional note, then send. A failure stays in the sheet. mWeb twin: RequestEventDialog. */
export function RequestEventSheet({
  open,
  body,
  sending,
  error,
  onClose,
  onSubmit,
}: Readonly<RequestEventSheetProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeEventRequestSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<EventRequestValues>({
    defaultValues: eventRequestDefaults,
    resolver: formResolver<EventRequestValues>(schema),
    mode: 'onTouched',
  });

  const close = () => {
    reset(eventRequestDefaults);
    onClose();
  };
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values.note)) reset(eventRequestDefaults);
  });

  return (
    <DuncitDialog
      open={open}
      onClose={close}
      testID="request-event-sheet"
      title={t('publicPage.eventRequest.dialogTitle')}
      closeLabel={t('publicPage.eventRequest.cancel')}
      dismissOnBackdrop={!sending}
      footer={
        <PrimaryButton
          testID="request-event-send"
          label={sending ? t('publicPage.eventRequest.sending') : t('publicPage.eventRequest.send')}
          onPress={() => fireAndForget(submit())}
          disabled={sending}
          loading={sending}
        />
      }
    >
      <YStack gap={14} testID="request-event-form">
        <Text fontSize={14} color="$muted">
          {body}
        </Text>
        <FormTextField
          control={control}
          name="note"
          label={t('publicPage.eventRequest.noteLabel')}
          hint={t('publicPage.eventRequest.notePlaceholder')}
          multiline
          numberOfLines={4}
          maxLength={EVENT_REQUEST_NOTE_MAX}
        />
        {error ? (
          <Text role="alert" testID="request-event-error" fontSize={13} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
