import { useController, useWatch } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { FOOD_FEEDBACK_LIMITS } from '@duncit/utils';

import { Stars } from '@/components/details/ProductReviews/Stars';
import { FormTextField } from '@/components/FormTextField';
import type { FoodFeedback } from '@/hooks/useFoodFeedback';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { FoodFeedbackPhotos } from './FoodFeedbackPhotos';

const STAR_SIZE = 36;

interface Props {
  feedback: FoodFeedback;
  /** The rating is being sent: the fields lock with the button. */
  disabled: boolean;
}

/**
 * What a guest says about a served order: one to five stars, and optionally a
 * few words and photos. Tamagui twin of mWeb's food-feedback form — same
 * schema, same limits, same copy.
 */
export function FoodFeedbackForm({ feedback, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = feedback;
  const rating = useController({ control, name: 'rating' });
  const images = useWatch({ control, name: 'images' });
  const ratingError = rating.fieldState.error?.message;

  return (
    <YStack gap={12} testID="food-feedback-form">
      <YStack gap={6}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.venueFood.feedback.rating')}
        </Text>
        <Stars
          value={rating.field.value}
          onChange={rating.field.onChange}
          size={STAR_SIZE}
          label={t('mweb.venueFood.feedback.rating')}
          starLabel={(count) =>
            t('mweb.venueFood.feedback.stars', { vars: { count: String(count) } })
          }
          testIDPrefix="food-feedback-star"
          disabled={disabled}
        />
        {ratingError ? (
          <Text testID="food-feedback-rating-error" role="alert" fontSize={13} color="$danger">
            {ratingError}
          </Text>
        ) : null}
      </YStack>
      <FormTextField
        control={control}
        name="comment"
        label={t('mweb.venueFood.feedback.comment')}
        hint={t('mweb.venueFood.feedback.commentHint', {
          vars: { max: String(FOOD_FEEDBACK_LIMITS.commentMax) },
        })}
        multiline
        numberOfLines={3}
        maxLength={FOOD_FEEDBACK_LIMITS.commentMax}
        editable={!disabled}
      />
      <YStack gap={6}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.venueFood.feedback.photos')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('mweb.venueFood.feedback.photosHint', {
            vars: { max: String(FOOD_FEEDBACK_LIMITS.imagesMax) },
          })}
        </Text>
        <FoodFeedbackPhotos
          images={images}
          onAdd={() => fireAndForget(feedback.addPhoto())}
          onRemove={feedback.removePhoto}
          uploading={feedback.uploading}
          error={feedback.photoError}
          disabled={disabled}
        />
      </YStack>
    </YStack>
  );
}
