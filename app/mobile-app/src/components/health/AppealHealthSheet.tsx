import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  HEALTH_APPEAL_MESSAGE_MAX,
  HEALTH_APPEAL_REASONS,
  HEALTH_APPEAL_REASON_KEY,
  isHealthAppealReason,
  type HealthAppealReason,
} from '@duncit/utils';
import {
  healthAppealDefaults,
  makeHealthAppealSchema,
  type HealthAppealValues,
} from '@duncit/forms/schemas';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { ChoiceChip } from '@/components/brand-orders/ChoiceChip';
import { HealthAppealReason as ReasonInput } from '@/generated/graphql/graphql';
import { MobileAppealHealthAdjustmentDocument } from '@/graphql/health';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { formResolver } from '@/utils/form-resolver';
import type { HealthAdjustmentLike } from '@/utils/health';

/** The form's reason as the generated mutation input spells it. */
const REASON_INPUT: Readonly<Record<HealthAppealReason, ReasonInput>> = {
  WONT_HAPPEN_AGAIN: ReasonInput.WontHappenAgain,
  INCORRECT: ReasonInput.Incorrect,
};

interface Props {
  /** The deduction being appealed; null keeps the sheet closed. */
  adjustment: HealthAdjustmentLike | null;
  onClose: () => void;
  /** Fired once Legal has it, so the history can reload behind the sheet. */
  onAppealed: () => void;
}

function AppealDialog({ adjustment, onClose, onAppealed }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => makeHealthAppealSchema(t), [t]);
  const { control, handleSubmit } = useForm<HealthAppealValues, any, HealthAppealValues>({
    resolver: formResolver<HealthAppealValues>(schema),
    defaultValues: healthAppealDefaults,
  });

  const submit = handleSubmit(async (values) => {
    // The schema has already refused anything else; this narrows the type.
    if (!adjustment || !isHealthAppealReason(values.reason)) return;
    setBusy(true);
    setError(null);
    try {
      await graphqlRequest(
        MobileAppealHealthAdjustmentDocument,
        {
          input: {
            adjustment_id: adjustment.id,
            reason: REASON_INPUT[values.reason],
            message: values.message,
          },
        },
        { auth: true },
      );
      setSent(true);
      onAppealed();
    } catch (e) {
      setError(toErrorMessage(e) || t('healthAppeal.submitFailed'));
    } finally {
      setBusy(false);
    }
  });

  const footer = sent ? (
    <DuncitButton
      testID="appeal-health-done"
      label={t('healthAppeal.done')}
      onPress={onClose}
      fullWidth
    />
  ) : (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="appeal-health-cancel"
          label={t('healthAppeal.cancel')}
          onPress={onClose}
          variant="ghost"
          tone="neutral"
          fullWidth
          disabled={busy}
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="appeal-health-submit"
          label={busy ? t('healthAppeal.sending') : t('healthAppeal.submit')}
          onPress={() => {
            submit().catch(() => undefined);
          }}
          fullWidth
          disabled={busy}
          loading={busy}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={!!adjustment}
      onClose={busy ? () => undefined : onClose}
      testID="appeal-health"
      title={t('healthAppeal.title')}
      subtitle={sent ? undefined : t('healthAppeal.subtitle')}
      closeLabel={t('healthAppeal.cancel')}
      variant="center"
      dismissOnBackdrop={false}
      showCloseButton={!busy}
      footer={footer}
    >
      {sent ? (
        <Text testID="appeal-health-sent" role="status" fontSize={14} color="$color">
          {t('healthAppeal.submitted')}
        </Text>
      ) : (
        <YStack gap={12}>
          <Text testID="appeal-health-deduction" fontSize={14} fontWeight="600" color="$color">
            {t('healthAppeal.deductionLine', {
              vars: { points: Math.abs(adjustment?.delta ?? 0), remark: adjustment?.remark || '—' },
            })}
          </Text>
          <Controller
            control={control}
            name="reason"
            render={({ field, fieldState }) => (
              <YStack gap={8}>
                <Text fontSize={12.5} fontWeight="600" color="$muted">
                  {t('healthAppeal.reasonLabel')}
                </Text>
                <XStack
                  gap={8}
                  flexWrap="wrap"
                  role="group"
                  aria-label={t('healthAppeal.reasonLabel')}
                >
                  {HEALTH_APPEAL_REASONS.map((reason) => (
                    <ChoiceChip
                      key={reason}
                      testID={`appeal-health-reason-${reason}`}
                      label={t(HEALTH_APPEAL_REASON_KEY[reason])}
                      active={field.value === reason}
                      onPress={() => field.onChange(reason)}
                    />
                  ))}
                </XStack>
                {fieldState.error ? (
                  <Text role="alert" fontSize={12.5} color="$danger">
                    {fieldState.error.message}
                  </Text>
                ) : null}
              </YStack>
            )}
          />
          <FormTextField
            control={control}
            name="message"
            label={t('healthAppeal.messageLabel')}
            placeholder={t('healthAppeal.messagePlaceholder')}
            maxLength={HEALTH_APPEAL_MESSAGE_MAX}
            multiline
            required
          />
          {error ? (
            <Text role="alert" testID="appeal-health-error" fontSize={12.5} color="$danger">
              {error}
            </Text>
          ) : null}
        </YStack>
      )}
    </DuncitDialog>
  );
}

/**
 * Appeal one health deduction to Legal — the Tamagui twin of mWeb's
 * AppealHealthDialog (rule 27). Keyed on the deduction so reopening for
 * another one starts from a clean form.
 */
export function AppealHealthSheet(props: Readonly<Props>) {
  return <AppealDialog key={props.adjustment?.id ?? 'none'} {...props} />;
}
