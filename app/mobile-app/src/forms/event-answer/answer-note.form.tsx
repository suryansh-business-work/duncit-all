import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { makeAnswerNoteSchema, type AnswerNoteValues } from './event-answer.types';

interface Props {
  open: boolean;
  /** Accept asks once; Reject is the destructive one. */
  kind: 'ACCEPT' | 'REJECT';
  busy: boolean;
  onClose: () => void;
  onSend: (note: string) => void;
}

/** Accept or reject a request, with an optional note to the member. */
export function AnswerNoteForm({ open, kind, busy, onClose, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeAnswerNoteSchema(t), [t]);
  const { control, handleSubmit } = useForm<AnswerNoteValues, any, AnswerNoteValues>({
    resolver: formResolver<AnswerNoteValues>(schema),
    defaultValues: { note: '' },
  });
  const send = handleSubmit((values) => onSend(values.note));
  const reject = kind === 'REJECT';

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="event-answer-cancel"
          label={t('availability.eventInbox.cancel')}
          onPress={onClose}
          variant="ghost"
          tone="neutral"
          fullWidth
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="event-answer-send"
          label={reject ? t('availability.eventInbox.reject') : t('availability.eventInbox.accept')}
          onPress={() => {
            send().catch(() => undefined);
          }}
          tone={reject ? 'danger' : 'primary'}
          loading={busy}
          disabled={busy}
          fullWidth
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="event-answer"
      title={
        reject ? t('availability.eventInbox.rejectTitle') : t('availability.eventInbox.acceptTitle')
      }
      closeLabel={t('mweb.common.close')}
      variant="center"
      footer={footer}
    >
      <FormTextField
        control={control}
        name="note"
        label={t('availability.eventInbox.noteLabel')}
        multiline
        numberOfLines={3}
      />
    </DuncitDialog>
  );
}
