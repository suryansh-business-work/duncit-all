import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import {
  HEALTH_APPEAL_MESSAGE_MAX,
  HEALTH_APPEAL_REASONS,
  HEALTH_APPEAL_REASON_KEY,
  parseApiError,
} from '@duncit/utils';
import RhfTextField from '../../../forms/components/RhfTextField';
import {
  healthAppealDefaults,
  makeHealthAppealSchema,
  type HealthAppealValues,
} from './appeal-health.types';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  /** The dialog's submit button lives outside the form and targets it by id. */
  formId: string;
  onSubmit: (values: HealthAppealValues) => Promise<void>;
}

type AppealResolver = Resolver<HealthAppealValues, unknown, HealthAppealValues>;

/**
 * The reason and explanation of a health appeal (RHF + Zod + MUI). The reasons
 * are chips, as on the native sheet; a failed mutation lands on the form's root
 * error, under the fields, rather than in a toast the person may have missed.
 */
export default function AppealHealthForm({ formId, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeHealthAppealSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<HealthAppealValues, unknown, HealthAppealValues>({
    defaultValues: healthAppealDefaults,
    resolver: zodResolver(schema) as unknown as AppealResolver,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      setError('root', { message: parseApiError(error) || t('healthAppeal.submitFailed') });
    }
  });

  return (
    <Stack component="form" id={formId} noValidate onSubmit={submit} spacing={2} data-testid="appeal-health-form">
      <Controller
        control={control}
        name="reason"
        render={({ field, fieldState }) => (
          <Stack spacing={0.75}>
            <Typography id="appeal-health-reason-label" variant="subtitle2" sx={{ color: 'text.secondary' }}>
              {t('healthAppeal.reasonLabel')}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              role="group"
              aria-labelledby="appeal-health-reason-label"
              sx={{ flexWrap: 'wrap' }}
            >
              {HEALTH_APPEAL_REASONS.map((reason) => (
                <Chip
                  key={reason}
                  label={t(HEALTH_APPEAL_REASON_KEY[reason])}
                  data-testid={`appeal-health-reason-${reason}`}
                  color={field.value === reason ? 'primary' : 'default'}
                  aria-pressed={field.value === reason}
                  onClick={() => field.onChange(reason)}
                />
              ))}
            </Stack>
            {fieldState.error && (
              <Typography variant="caption" color="error" role="alert">
                {fieldState.error.message}
              </Typography>
            )}
          </Stack>
        )}
      />
      <RhfTextField
        control={control}
        name="message"
        label={t('healthAppeal.messageLabel')}
        placeholder={t('healthAppeal.messagePlaceholder')}
        required
        multiline
        minRows={3}
        slotProps={{
          htmlInput: { maxLength: HEALTH_APPEAL_MESSAGE_MAX, 'data-testid': 'appeal-health-message-input' },
        }}
      />
      {errors.root?.message && (
        <Alert severity="error" data-testid="appeal-health-form-error">
          {errors.root.message}
        </Alert>
      )}
    </Stack>
  );
}
