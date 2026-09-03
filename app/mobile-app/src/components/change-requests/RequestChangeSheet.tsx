import { useState } from 'react';
import { Input, Text, YStack } from 'tamagui';
import { changeRequestConfirmKey, type PodChangeRole } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { Field } from '@/components/Field/Field';
import { useTranslation } from '@/hooks/useTranslation';

const REASON_MAX = 500;

interface Props {
  open: boolean;
  role: PodChangeRole;
  /** Account Health points this ask costs, from the board's own numbers. */
  penalty: number;
  /** Seats already sold, so the partner sees who they are affecting. */
  attendeeCount: number;
  busy: boolean;
  errorText?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * The one thing between a tap and a deduction — the Tamagui twin of
 * `RequestChangeDialog` in `@duncit/pod-change-requests` (rule 27).
 *
 * It states the cost in points and the number of people already holding a seat
 * BEFORE anything is filed, because neither can be undone: withdrawing does not
 * return the points, and the guests are somebody else's evening. The reason is
 * required — it is the only thing an admin has to decide between finding a
 * replacement and cancelling the pod.
 */
export function RequestChangeSheet({
  open,
  role,
  penalty,
  attendeeCount,
  busy,
  errorText,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const missing = reason.trim().length === 0;
  const invalid = touched && missing;

  const close = () => {
    setReason('');
    setTouched(false);
    onClose();
  };

  const submit = () => {
    setTouched(true);
    if (missing) return;
    onConfirm(reason.trim());
  };

  return (
    <DuncitDialog
      open={open}
      onClose={close}
      testID="request-change-sheet"
      title={t('changeRequest.confirmTitle')}
      closeLabel={t('changeRequest.cancelCta')}
      variant="sheet"
      dismissOnBackdrop={!busy}
      footer={
        <YStack gap={8}>
          <DuncitButton
            testID="request-change-confirm"
            label={t('changeRequest.confirmCta')}
            onPress={submit}
            tone="danger"
            fullWidth
            loading={busy}
            disabled={busy}
          />
          <DuncitButton
            testID="request-change-cancel"
            label={t('changeRequest.cancelCta')}
            onPress={close}
            variant="ghost"
            fullWidth
            disabled={busy}
          />
        </YStack>
      }
    >
      <YStack gap={12}>
        <Text fontSize={13} color="$color">
          {t(changeRequestConfirmKey(role))}
        </Text>
        <Text testID="request-change-penalty" fontSize={12.5} fontWeight="700" color="$warning">
          {penalty > 0
            ? t('changeRequest.penaltyNotice', { count: penalty, vars: { points: penalty } })
            : t('changeRequest.penaltyFree')}
        </Text>
        {attendeeCount > 0 ? (
          <Text testID="request-change-attendees" fontSize={12.5} color="$muted">
            {t('changeRequest.attendeeNotice', {
              count: attendeeCount,
              vars: { count: attendeeCount },
            })}
          </Text>
        ) : null}
        <Field
          testID="request-change-reason"
          label={t('changeRequest.reasonLabel')}
          required
          hint={t('changeRequest.reasonHint')}
          error={invalid ? t('changeRequest.reasonRequired') : undefined}
        >
          <Input
            testID="request-change-reason-input"
            aria-label={t('changeRequest.reasonLabel')}
            value={reason}
            onChangeText={setReason}
            onBlur={() => setTouched(true)}
            multiline
            numberOfLines={3}
            maxLength={REASON_MAX}
            minHeight={92}
            textAlignVertical="top"
          />
        </Field>
        {errorText ? (
          <Text testID="request-change-error" fontSize={12.5} color="$danger">
            {errorText}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
