import { Box, Link, Rating, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

/** What a guest left after a served food order. */
export interface FoodFeedbackContent {
  rating: number;
  comment: string;
  images: readonly string[];
}

interface Props {
  feedback: FoodFeedbackContent;
  /** Prefix for the test ids, so two lists of feedback on one page stay apart. */
  'data-testid'?: string;
}

/** The side of a feedback photo's thumbnail, in theme spacing units. */
const THUMB_SIZE = 8;

/**
 * A guest's food feedback, read-only: the stars, what they wrote and the photos
 * they attached. The order board's details dialog and the Food Dashboard's
 * recent feedback both draw it, so a rating reads the same in either place.
 */
export default function FoodFeedbackBody({ feedback, 'data-testid': testId = 'food-feedback' }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} data-testid={testId}>
      <Rating
        readOnly
        size="small"
        value={feedback.rating}
        aria-label={t('partners.foodOrders.ratingOutOf', { vars: { rating: feedback.rating } })}
      />
      {feedback.comment && (
        <Typography variant="body2" sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}>
          {feedback.comment}
        </Typography>
      )}
      {feedback.images.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap component="ul" sx={{ flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0 }}>
          {feedback.images.map((url, index) => (
            <Box component="li" key={url}>
              <Link
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('partners.foodOrders.feedbackPhotoOpen', { vars: { n: index + 1 } })}
                data-testid={`${testId}-photo`}
                sx={{ display: 'block', borderRadius: 1, lineHeight: 0 }}
              >
                <Box
                  component="img"
                  src={url}
                  alt={t('partners.foodOrders.feedbackPhoto', { vars: { n: index + 1 } })}
                  loading="lazy"
                  sx={{
                    width: (theme) => theme.spacing(THUMB_SIZE),
                    height: (theme) => theme.spacing(THUMB_SIZE),
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                  }}
                />
              </Link>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
