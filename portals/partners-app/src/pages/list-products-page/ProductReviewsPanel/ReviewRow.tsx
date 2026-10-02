import { useState } from 'react';
import { Box, Rating, Stack, TextField, Typography } from '@mui/material';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { Review } from './queries';

export default function ReviewRow({
  review,
  onReply,
}: Readonly<{ review: Review; onReply: (id: string, reply: string) => Promise<void> }>) {
  const { t } = useTranslation();
  const [reply, setReply] = useState(review.seller_reply || '');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await onReply(review.id, reply.trim());
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <Typography sx={{
          fontWeight: 800
        }}>{review.user_name}</Typography>
        <Rating value={review.rating} readOnly size="small" />
      </Stack>
      {review.comment && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {review.comment}
        </Typography>
      )}
      {review.images.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, overflowX: 'auto' }}>
          {review.images.map((u) => (
            <Box
              key={u}
              component="img"
              src={u}
              alt={t('partners.listProductsPage.review')}
              sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover' }}
            />
          ))}
        </Stack>
      )}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mt: 0.5,
          color: 'text.secondary'
        }}>
        <ThumbUpAltIcon titleAccess={t('partners.a11y.upVotes')} sx={{ fontSize: 15 }} />
        <Typography variant="caption">{review.up_votes}</Typography>
        <ThumbDownAltIcon titleAccess={t('partners.a11y.downVotes')} sx={{ fontSize: 15 }} />
        <Typography variant="caption">{review.down_votes}</Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <TextField
          size="small"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t('partners.listProductsPage.replyToThisReview')}
          slotProps={{ htmlInput: { 'aria-label': t('partners.listProductsPage.replyToThisReview') } }}
          fullWidth
        />
        <DuncitButton variant="outlined" onClick={submit} disabled={saving || !reply.trim()}>
          {review.seller_reply ? 'Update' : 'Reply'}
        </DuncitButton>
      </Stack>
    </Box>
  );
}
