import { useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, FormHelperText, Rating, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { SUBMIT_REVIEW } from '../../../graphql/product';
import { useStoreT } from '../../../i18n';
import { makeReviewSchema, type ReviewValues } from './review.types';

/**
 * A signed-in buyer's review. The server accepts it only from someone the
 * product was delivered to, and its refusal is shown as it is worded.
 */
export function ReviewForm({ productId }: Readonly<{ productId: string }>) {
  const { t } = useStoreT();
  const ratingLabel = useId();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const schema = useMemo(() => makeReviewSchema(t), [t]);
  const [submitReview] = useMutation(SUBMIT_REVIEW, { refetchQueries: ['EcommStoreProductReviews', 'EcommStoreProduct'] });
  const { control, handleSubmit, formState } = useForm<ReviewValues>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 0, comment: '' },
  });

  const submit = handleSubmit(async ({ rating, comment }) => {
    setError('');
    try {
      await submitReview({ variables: { input: { product_id: productId, rating, comment: comment || undefined } } });
      setDone(true);
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.reviews.failed')));
    }
  });

  if (done) return <Alert severity="success">{t('ecommStore.reviews.thanks')}</Alert>;
  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate>
      <Typography variant="h4" component="h3">
        {t('ecommStore.reviews.write')}
      </Typography>
      <Controller
        control={control}
        name="rating"
        render={({ field, fieldState }) => (
          <Stack>
            <Typography id={ratingLabel} variant="body2" sx={{ fontWeight: 700 }}>
              {t('ecommStore.reviews.yourRating')}
            </Typography>
            <Rating
              name="rating"
              value={field.value || null}
              onChange={(_event, value) => field.onChange(value ?? 0)}
              aria-labelledby={ratingLabel}
              size="large"
            />
            {fieldState.error ? <FormHelperText error>{fieldState.error.message}</FormHelperText> : null}
          </Stack>
        )}
      />
      <RhfTextField control={control} name="comment" multiline minRows={3} label={t('ecommStore.reviews.comment')} />
      <Stack aria-live="assertive">{error ? <Alert severity="error">{error}</Alert> : null}</Stack>
      <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-start' }}>
        {t('ecommStore.reviews.submit')}
      </DuncitButton>
    </Stack>
  );
}
