import { useState } from 'react';
import { Text, TextArea, XStack } from 'tamagui';

import { Field } from '@/components/Field';
import { Backdrop, ModalButton } from './ModalBase';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  busy?: boolean;
  error?: string;
  deadlineLabel?: string;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

/** Captures an optional reason before re-opening a resolved ticket/chat (Bug 11). */
export function ReopenReasonModal({
  open,
  busy,
  error,
  deadlineLabel,
  onSubmit,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <Backdrop
      testID="reopen-reason-modal"
      footer={
        <XStack gap={8} justifyContent="flex-end">
          <ModalButton testID="reopen-cancel" label={t('mweb.common.cancel')} onPress={onClose} />
          <ModalButton
            testID="reopen-submit"
            label={busy ? 'Re-opening…' : 'Re-open'}
            primary
            disabled={busy}
            onPress={() => onSubmit(reason.trim())}
          />
        </XStack>
      }
    >
      <Text fontSize={16} fontWeight="700" color="$color">
        Re-open this conversation
      </Text>
      <Text fontSize={13} color="$muted">
        Tell us why you need to re-open it so the team can help faster (optional).
      </Text>
      {deadlineLabel ? (
        <Text testID="reopen-deadline" fontSize={12} color="$muted">
          You can reopen until {deadlineLabel}
        </Text>
      ) : null}
      <Field label={t('mweb.common.reason')}>
        <TextArea
          testID="reopen-reason-input"
          aria-label={t('mweb.common.reason')}
          value={reason}
          onChangeText={setReason}
          placeholder={t('mweb.supportChat.reasonForReOpeningOptional')}
          placeholderTextColor="$muted"
          maxLength={1000}
          backgroundColor="$surface"
          borderColor="$borderColor"
        />
      </Field>
      {error ? (
        <Text testID="reopen-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </Backdrop>
  );
}
