import { Avatar, Box, Rating, Stack, Typography } from '@mui/material';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import { DuncitIconButton } from '@duncit/buttons';
import { ScrollRail } from '@duncit/ui';
import { useTranslation } from '../../../i18n/useTranslation';
import type { Review } from './types';

interface ReviewCardProps {
  r: Review;
  vote: (id: string, value: number, current: number) => Promise<unknown>;
}

/** One review: author, stars, comment, photos, seller reply and thumbs. */
export default function ReviewCard({ r, vote }: Readonly<ReviewCardProps>) {
  const { t } = useTranslation();
  return (
    <Box data-testid={`review-card-${r.id}`} sx={{ borderTop: 1, borderColor: 'divider', pt: 1.25 }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <Avatar aria-hidden sx={{ width: 28, height: 28, fontSize: 13 }}>{(r.user_name[0] ?? 'U').toUpperCase()}</Avatar>
        <Typography variant="body2" sx={{
          fontWeight: 600
        }}>
          {r.user_name}
        </Typography>
        <Rating
          value={r.rating}
          readOnly
          size="small"
          getLabelText={(value) => t('mweb.a11y.starRating', { vars: { rating: value } })}
        />
      </Stack>
      {r.comment && (
        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
          {r.comment}
        </Typography>
      )}
      {r.images.length > 0 && (
        <ScrollRail testId={`product-review-images-${r.id}`} gap={1} sx={{ mt: 0.5 }}>
          {r.images.map((url) => (
            <Box
              key={url}
              component="img"
              src={url}
              alt={t('mweb.podDetails.review')}
              sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover' }}
            />
          ))}
        </ScrollRail>
      )}
      {r.seller_reply && (
        <Box sx={{ mt: 0.75, ml: 2, p: 1, bgcolor: 'action.hover', borderRadius: '16px' }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: "accent.main"
            }}>
            Seller response
          </Typography>
          <Typography variant="body2">{r.seller_reply}</Typography>
        </Box>
      )}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          mt: 0.5
        }}>
        <DuncitIconButton
          size="small"
          color={r.my_vote === 1 ? 'primary' : 'default'}
          aria-label={t('mweb.faqsPage.helpful')}
          aria-pressed={r.my_vote === 1}
          onClick={() => vote(r.id, 1, r.my_vote)}
          data-testid={`review-up-${r.id}`}
        >
          <ThumbUpOffAltIcon fontSize="small" />
        </DuncitIconButton>
        <Typography variant="caption">{r.up_votes}</Typography>
        <DuncitIconButton
          size="small"
          color={r.my_vote === -1 ? 'error' : 'default'}
          aria-label={t('mweb.a11y.notHelpful')}
          aria-pressed={r.my_vote === -1}
          onClick={() => vote(r.id, -1, r.my_vote)}
          data-testid={`review-down-${r.id}`}
        >
          <ThumbDownOffAltIcon fontSize="small" />
        </DuncitIconButton>
        <Typography variant="caption">{r.down_votes}</Typography>
      </Stack>
    </Box>
  );
}
