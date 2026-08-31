import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import MediaUrlsField from '../../pages/create-pod-page/create-pod/fields/MediaUrlsField';
import RhfTextField from '../components/RhfTextField';
import { useReportProblemConfig } from './useReportProblemConfig';
import { buildFeedbackSchema, feedbackDefaults, type FeedbackValues } from './feedback.types';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: FeedbackValues) => Promise<void> | void;
}

/**
 * Report-a-problem / feedback form (RHF + Zod + MUI).
 *
 * Twin of the native FeedbackForm, and deliberately the same SHAPE: category
 * chips (not a dropdown — the two surfaces had drifted), the same prompt, the
 * same screenshot picker. All three come from `reportProblemConfig`, so Support
 * editing them in the portal changes both surfaces at once instead of either
 * needing a release.
 */
export default function FeedbackForm({ loading, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { config, loading: configLoading } = useReportProblemConfig();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The minimum length is configuration, so the resolver is rebuilt when it
  // changes rather than frozen at whatever the first render saw.
  const schema = useMemo(
    () => buildFeedbackSchema(config.message_min_length),
    [config.message_min_length]
  );
  const { control, handleSubmit, setValue, watch } = useForm<FeedbackValues, any, FeedbackValues>({
    defaultValues: feedbackDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  const category = watch('category');
  // Default to the first chip the server offers, once it has answered.
  useEffect(() => {
    const first = config.categories[0];
    if (!category && first) setValue('category', first.label);
  }, [category, config.categories, setValue]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('mweb.common.somethingWentWrong'));
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <Controller
          control={control}
          name="category"
          render={({ field, fieldState }) => (
            <Stack spacing={0.75}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 700
                }}>
                Category
              </Typography>
              {configLoading && config.categories.length === 0 ? (
                <CircularProgress size={18} />
              ) : (
                <Stack direction="row" spacing={1} useFlexGap sx={{
                  flexWrap: "wrap"
                }}>
                  {config.categories.map((option) => (
                    <Chip
                      key={option.key || option.label}
                      label={option.label}
                      data-testid={`feedback-cat-${option.label}`}
                      color={field.value === option.label ? 'primary' : 'default'}
                      variant={field.value === option.label ? 'filled' : 'outlined'}
                      onClick={() => field.onChange(option.label)}
                      sx={{ fontWeight: 700 }}
                    />
                  ))}
                </Stack>
              )}
              {fieldState.error && (
                <Typography variant="caption" color="error">
                  {fieldState.error.message}
                </Typography>
              )}
            </Stack>
          )}
        />

        <RhfTextField
          control={control}
          name="message"
          label={config.message_label}
          required
          multiline
          minRows={4}
          placeholder={t('mweb.common.describeTheProblemOrShareYour')}
          hint={config.message_hint}
          size="small"
        />

        {config.allow_media && (
          <Controller
            control={control}
            name="media_text"
            render={({ field, fieldState }) => (
              <MediaUrlsField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                label={t('mweb.common.screenshotsOptional')}
                required={false}
                folder="/feedback"
                maxImages={config.max_media}
              />
            )}
          />
        )}

        <DuncitButton
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          data-testid="feedback-submit"
          sx={{ borderRadius: '16px', py: 1.1, fontWeight: 700, textTransform: 'none' }}
        >
          {loading ? 'Sending…' : 'Send feedback'}
        </DuncitButton>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
      </Stack>
    </form>
  );
}
