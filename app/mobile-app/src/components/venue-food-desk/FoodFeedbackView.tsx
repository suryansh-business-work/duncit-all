import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { Stars } from '@/components/details/ProductReviews/Stars';
import { useTranslation } from '@/hooks/useTranslation';

/** The side of a feedback photo's thumbnail. */
const THUMB = 64;

interface Props {
  feedback: { rating: number; comment: string; images: readonly string[] };
  testID: string;
}

/**
 * A guest's food feedback, read-only: the stars, what they wrote and their
 * photos — the twin of @duncit/venue-food's FoodFeedbackBody, used by the
 * order details and the dashboard's recent feedback alike.
 */
export function FoodFeedbackView({ feedback, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={6} testID={testID}>
      <Stars
        value={feedback.rating}
        size={16}
        label={t('venueFoodOwner.orders.ratingOutOf', { vars: { rating: feedback.rating } })}
      />
      {feedback.comment ? (
        <Text fontSize={13} color="$color">
          {feedback.comment}
        </Text>
      ) : null}
      {feedback.images.length > 0 ? (
        <XStack gap={8} flexWrap="wrap">
          {feedback.images.map((url, index) => (
            <AppImage
              key={url}
              source={{ uri: url }}
              style={{ width: THUMB, height: THUMB, borderRadius: 8 }}
              accessibilityLabel={t('venueFoodOwner.orders.feedbackPhoto', {
                vars: { n: index + 1 },
              })}
              testID={`${testID}-photo`}
            />
          ))}
        </XStack>
      ) : null}
    </YStack>
  );
}
