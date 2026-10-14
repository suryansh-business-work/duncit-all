import { useEffect, useRef } from 'react';
import { Box, Link, Rating, Stack, Typography } from '@mui/material';
import { canRateFoodOrder, type VenueFoodFeedback, type VenueFoodOrder } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';
import { FoodFeedbackForm } from './food-feedback';
import { useFoodFeedback } from './useFoodFeedback';

interface Props {
  order: VenueFoodOrder;
  /** The order's access key — what proves it is this guest's. */
  orderKey: string | null;
  /** The page was opened from the "rate your order" message: bring the form into view. */
  focus: boolean;
  /** The rating was saved — or turned out to be saved already: re-read the order. */
  onRated: () => void;
}

const THUMB = 72;

/** What the guest said, once they have said it. */
function GivenFeedback({ feedback }: Readonly<{ feedback: VenueFoodFeedback }>) {
  const { t } = useTranslation();
  const said = t('mweb.venueFood.feedback.yourRating', { vars: { rating: String(feedback.rating) } });
  return (
    <Stack spacing={1} data-testid="food-order-feedback-given">
      <Rating value={feedback.rating} readOnly aria-label={said} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {said}
      </Typography>
      {feedback.comment && (
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }} data-testid="food-order-feedback-comment">
          {feedback.comment}
        </Typography>
      )}
      {feedback.images.length > 0 && (
        <Stack component="ul" direction="row" sx={{ listStyle: 'none', m: 0, p: 0, gap: 1, flexWrap: 'wrap' }}>
          {feedback.images.map((url, index) => (
            <Box key={url} component="li">
              <Link href={url} target="_blank" rel="noopener noreferrer" sx={{ display: 'block' }}>
                <Box
                  component="img"
                  src={url}
                  alt={t('mweb.venueFood.feedback.photoAlt', { vars: { number: String(index + 1) } })}
                  sx={{ width: THUMB, height: THUMB, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider', display: 'block' }}
                />
              </Link>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/**
 * The food rating on a served order: the form until the guest has rated it,
 * then what they said. Nothing is shown for an order that was never served.
 */
export default function FoodOrderFeedbackCard({ order, orderKey, focus, onRated }: Readonly<Props>) {
  const { t } = useTranslation();
  const feedback = useFoodFeedback(order.id, orderKey, onRated);
  const card = useRef<HTMLDivElement>(null);
  const rateable = canRateFoodOrder(order);

  useEffect(() => {
    if (focus && rateable) card.current?.scrollIntoView({ block: 'start' });
  }, [focus, rateable]);

  if (!rateable && !order.feedback) return null;

  return (
    <Stack ref={card} spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }} data-testid="food-order-feedback">
      <SectionHeader
        testId="food-order-feedback-header"
        title={t(order.feedback ? 'mweb.venueFood.feedback.thanksTitle' : 'mweb.venueFood.feedback.title')}
      />
      {order.feedback ? (
        <GivenFeedback feedback={order.feedback} />
      ) : (
        <FoodFeedbackForm
          venueName={order.venue_name}
          uploading={feedback.uploading}
          submitting={feedback.submitting}
          error={feedback.error}
          onDismissError={feedback.clearError}
          onUploadPhoto={feedback.uploadPhoto}
          onSubmit={feedback.submit}
        />
      )}
    </Stack>
  );
}
