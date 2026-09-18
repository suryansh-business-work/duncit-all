import { Rating, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../components/FormDialog';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import type { StoreReviewRow } from '../queries';
import { makeReviewReplySchema, REPLY_MAX, type ReviewReplyValues } from './review-reply.types';

interface ReviewReplyFormProps {
  review: StoreReviewRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reply: string) => Promise<void>;
}

/** Answer a review in the store's name — shown under it on the product page. */
export default function ReviewReplyForm({ review, busy, onClose, onSubmit }: Readonly<ReviewReplyFormProps>) {
  const { t, form } = useSchemaForm<ReviewReplyValues>(makeReviewReplySchema, { reply: review.seller_reply });
  const { control, handleSubmit } = form;
  return (
    <FormDialog
      formId="review-reply-form"
      title={t('ecommPortal.reviews.replyTitle', { vars: { name: review.user_name } })}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit((values) => onSubmit(values.reply))}
      submitLabel={t('ecommPortal.reviews.sendReply')}
    >
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{review.product_name}</Typography>
          <Rating value={review.rating} readOnly size="small" />
          <Typography variant="body2">{review.comment || t('ecommPortal.reviews.noComment')}</Typography>
        </Stack>
        <RhfTextField
          control={control}
          name="reply"
          label={t('ecommPortal.reviews.reply')}
          multiline
          minRows={3}
          required
          hint={t('ecommPortal.form.maxChars', { vars: { max: REPLY_MAX } })}
        />
      </Stack>
    </FormDialog>
  );
}
