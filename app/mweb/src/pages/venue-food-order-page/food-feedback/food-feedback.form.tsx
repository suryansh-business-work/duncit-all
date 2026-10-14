import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormHelperText, Rating, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { FOOD_FEEDBACK_LIMITS } from '@duncit/utils';
import RhfTextField from '../../../forms/components/RhfTextField';
import { useTranslation } from '../../../i18n/useTranslation';
import FoodFeedbackPhotos from './FoodFeedbackPhotos';
import {
  foodFeedbackDefaults,
  makeFoodFeedbackSchema,
  type FoodFeedbackFormProps,
  type FoodFeedbackValues,
} from './food-feedback.types';

const RATING_LABEL_ID = 'food-feedback-rating-label';

/**
 * How the food was: a star rating, and — only if the guest wants — a few words
 * and up to three photos (React Hook Form + Zod). One rating per order, so the
 * form is shown once and replaced by what was said.
 */
export default function FoodFeedbackForm({
  venueName,
  uploading,
  submitting,
  error,
  onDismissError,
  onUploadPhoto,
  onSubmit,
}: Readonly<FoodFeedbackFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeFoodFeedbackSchema(t), [t]);
  const { control, handleSubmit } = useForm<FoodFeedbackValues, unknown, FoodFeedbackValues>({
    defaultValues: foodFeedbackDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<FoodFeedbackValues, unknown, FoodFeedbackValues>,
    mode: 'onSubmit',
  });
  const busy = submitting || uploading;

  return (
    <Stack component="form" noValidate onSubmit={handleSubmit(onSubmit)} spacing={2} data-testid="food-feedback-form">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.venueFood.feedback.subtitle', { vars: { venue: venueName } })}
      </Typography>
      <Controller
        control={control}
        name="rating"
        render={({ field, fieldState }) => (
          <Stack spacing={0.5}>
            <Typography id={RATING_LABEL_ID} component="h4" variant="body2" sx={{ fontWeight: 600 }}>
              {t('mweb.venueFood.feedback.rating')}
            </Typography>
            <Rating
              size="large"
              aria-labelledby={RATING_LABEL_ID}
              value={field.value || null}
              onChange={(_event, next) => field.onChange(next ?? 0)}
              getLabelText={(stars) => t('mweb.venueFood.feedback.stars', { vars: { count: String(stars) } })}
              disabled={submitting}
              data-testid="food-feedback-rating"
            />
            {fieldState.error && (
              <FormHelperText error role="alert" data-testid="food-feedback-rating-error">
                {fieldState.error.message}
              </FormHelperText>
            )}
          </Stack>
        )}
      />
      <RhfTextField
        control={control}
        name="comment"
        label={t('mweb.venueFood.feedback.comment')}
        hint={t('mweb.venueFood.feedback.commentHint', { vars: { max: String(FOOD_FEEDBACK_LIMITS.commentMax) } })}
        multiline
        minRows={3}
        size="small"
        disabled={submitting}
        slotProps={{ htmlInput: { maxLength: FOOD_FEEDBACK_LIMITS.commentMax } }}
      />
      <Controller
        control={control}
        name="images"
        render={({ field, fieldState }) => (
          <FoodFeedbackPhotos
            images={field.value}
            onChange={field.onChange}
            onUpload={onUploadPhoto}
            uploading={uploading}
            disabled={submitting}
            error={fieldState.error?.message}
          />
        )}
      />
      {error && (
        <Alert severity="error" onClose={onDismissError} data-testid="food-feedback-error">
          {error}
        </Alert>
      )}
      <DuncitButton type="submit" variant="contained" fullWidth loading={submitting} disabled={busy} data-testid="food-feedback-submit">
        {t('mweb.venueFood.feedback.submit')}
      </DuncitButton>
    </Stack>
  );
}
