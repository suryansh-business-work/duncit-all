import type { ChangeEvent, RefObject } from 'react';
import { Alert, Box, Rating, Stack, TextField, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';

interface ReviewWriteFormProps {
  rating: number | null;
  setRating: (value: number | null) => void;
  comment: string;
  setComment: (value: string) => void;
  images: string[];
  removeImage: (url: string) => void;
  fileRef: RefObject<HTMLInputElement | null>;
  uploading: boolean;
  onPickImage: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  error: string | null;
  saving: boolean;
  submit: () => Promise<void>;
}

/** The viewer's write form: stars, comment, photos and submit. */
export default function ReviewWriteForm({
  rating,
  setRating,
  comment,
  setComment,
  images,
  removeImage,
  fileRef,
  uploading,
  onPickImage,
  error,
  saving,
  submit,
}: Readonly<ReviewWriteFormProps>) {
  const { t } = useTranslation();
  return (
    <Box data-testid="product-reviews-write" sx={{ border: 1, borderColor: 'divider', borderRadius: '16px', p: 1.5 }}>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          mb: 0.5
        }}>
        Write a review
      </Typography>
      <Rating
        value={rating}
        onChange={(_, v) => setRating(v)}
        getLabelText={(value) => t('mweb.a11y.rateStars', { vars: { stars: value } })}
        data-testid="review-rating-input"
      />
      <TextField
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('mweb.common.shareYourExperienceOptional')}
        slotProps={{ htmlInput: { 'aria-label': t('mweb.common.shareYourExperienceOptional') } }}
        multiline
        minRows={2}
        fullWidth
        size="small"
        data-testid="review-comment"
        sx={{ mt: 1 }}
      />
      {images.length > 0 && (
        <Stack direction="row" spacing={1} data-testid="review-photos" sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
          {images.map((url, index) => (
            <Box key={url} sx={{ position: 'relative' }}>
              <Box
                component="img"
                src={url}
                alt={t('mweb.podDetails.review')}
                sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover' }}
              />
              <DuncitRoundButton
                size="small"
                tone="paper"
                aria-label={t('mweb.common.removeAttachment')}
                onClick={() => removeImage(url)}
                data-testid={`review-photo-remove-${index}`}
                sx={{ position: 'absolute', top: -8, right: -8 }}
              >
                <CloseIcon />
              </DuncitRoundButton>
            </Box>
          ))}
        </Stack>
      )}
      <DuncitButton
        size="small"
        startIcon={<AddPhotoAlternateIcon />}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        data-testid="review-add-photo"
        sx={{ mt: 1 }}
      >
        {uploading ? 'Uploading…' : 'Add photo'}
      </DuncitButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPickImage}
        data-testid="review-photo-input"
      />
      {error && (
        <Alert severity="warning" role="alert" data-testid="review-error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      <DuncitButton
        variant="contained"
        size="small"
        onClick={submit}
        disabled={saving}
        data-testid="review-submit"
        sx={{ mt: 1, borderRadius: 999, fontWeight: 600 }}
      >
        {saving ? 'Submitting…' : 'Submit review'}
      </DuncitButton>
    </Box>
  );
}
