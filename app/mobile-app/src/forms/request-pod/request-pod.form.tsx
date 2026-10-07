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
  POD_REQUEST_NOTE_MAX,
  makePodRequestNoteSchema,
  podRequestNoteDefaults,
  type PodRequestNoteValues,
  type RequestPodSheetProps,
} from './request-pod.types';

/** "Request Pod": an optional note, then send. The server's refusal stays in the sheet. mWeb twin. */
export function RequestPodSheet({
  targetName,
  sending,
  error,
  onClose,
  onSubmit,
}: Readonly<RequestPodSheetProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePodRequestNoteSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<PodRequestNoteValues>({
    defaultValues: podRequestNoteDefaults,
    resolver: formResolver<PodRequestNoteValues>(schema),
    mode: 'onTouched',
  });

  const close = () => {
    reset(podRequestNoteDefaults);
    onClose();
  };
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values.note)) reset(podRequestNoteDefaults);
  });

  return (
    <DuncitDialog
      open={targetName !== null}
      onClose={close}
      testID="request-pod-sheet"
      title={t('podRequests.requestPod')}
      closeLabel={t('mweb.common.close')}
      dismissOnBackdrop={!sending}
      footer={
        <PrimaryButton
          testID="request-pod-send"
          label={t('podRequests.requestPod')}
          onPress={() => fireAndForget(submit())}
          disabled={sending}
          loading={sending}
        />
      }
    >
      <YStack gap={14} testID="request-pod-form">
        <Text fontSize={16} fontWeight="700" color="$color">
          {targetName}
        </Text>
        <FormTextField
          control={control}
          name="note"
          label={t('podRequests.noteLabel')}
          hint={t('podRequests.noteHint')}
          multiline
          numberOfLines={4}
          maxLength={POD_REQUEST_NOTE_MAX}
        />
        {error ? (
          <Text role="alert" testID="request-pod-error" fontSize={13} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
