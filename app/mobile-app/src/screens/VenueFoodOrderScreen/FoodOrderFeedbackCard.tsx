import { Text, YStack } from 'tamagui';
import type { VenueFoodFeedback, VenueFoodOrder } from '@duncit/utils';

import { FoodFeedbackForm } from '@/components/details/venue-food/food-feedback/FoodFeedbackForm';
import { FoodFeedbackPhotos } from '@/components/details/venue-food/food-feedback/FoodFeedbackPhotos';
import { Stars } from '@/components/details/ProductReviews/Stars';
import { DuncitButton } from '@/components/DuncitButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useFoodFeedback } from '@/hooks/useFoodFeedback';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  order: VenueFoodOrder;
  /** The key the screen reads the order with. */
  orderKey: string | null;
  /** The rating went in: read the order again. */
  onSubmitted: () => void;
}

/** The rating as it was given — it is written once, so this is all there is to do with it. */
function FeedbackThanks({ feedback }: Readonly<{ feedback: VenueFoodFeedback }>) {
  const { t } = useTranslation();
  return (
    <SurfaceCard gap={12} testID="food-order-feedback-thanks">
      <SectionHeader
        testID="food-order-feedback-thanks-header"
        title={t('mweb.venueFood.feedback.thanksTitle')}
      />
      <YStack gap={4}>
        <Stars value={feedback.rating} size={22} />
        <Text testID="food-order-feedback-rating" fontSize={14} color="$muted">
          {t('mweb.venueFood.feedback.yourRating', { vars: { rating: String(feedback.rating) } })}
        </Text>
      </YStack>
      {feedback.comment ? (
        <Text testID="food-order-feedback-comment" fontSize={14} color="$color">
          {feedback.comment}
        </Text>
      ) : null}
      <FoodFeedbackPhotos images={feedback.images} />
    </SurfaceCard>
  );
}

function FeedbackAsk({ order, orderKey, onSubmitted }: Readonly<Props>) {
  const { t } = useTranslation();
  const feedback = useFoodFeedback({
    orderId: order.id,
    accessKey: orderKey,
    onDone: onSubmitted,
  });
  // A photo still going up would be left out of the rating, so Send waits for it.
  const busy = feedback.submitting || feedback.uploading;

  return (
    <SurfaceCard gap={12} testID="food-order-feedback">
      <SectionHeader
        testID="food-order-feedback-header"
        title={t('mweb.venueFood.feedback.title')}
      />
      <Text fontSize={14} color="$muted">
        {t('mweb.venueFood.feedback.subtitle', { vars: { venue: order.venue_name } })}
      </Text>
      <FoodFeedbackForm feedback={feedback} disabled={feedback.submitting} />
      {feedback.error ? (
        <Text testID="food-order-feedback-error" role="alert" fontSize={13} color="$danger">
          {feedback.error}
        </Text>
      ) : null}
      <DuncitButton
        testID="food-order-feedback-submit"
        label={t('mweb.venueFood.feedback.submit')}
        fullWidth
        loading={feedback.submitting}
        disabled={busy}
        onPress={() => fireAndForget(feedback.submit())}
      />
    </SurfaceCard>
  );
}

/**
 * How the food was: the rating form for a served order nobody has rated yet,
 * and afterwards the rating as it was given. The caller draws this only for an
 * order in one of those two states. Tamagui twin of mWeb's
 * venue-food-order-page feedback card.
 */
export function FoodOrderFeedbackCard({ order, orderKey, onSubmitted }: Readonly<Props>) {
  if (order.feedback) return <FeedbackThanks feedback={order.feedback} />;
  return <FeedbackAsk order={order} orderKey={orderKey} onSubmitted={onSubmitted} />;
}
