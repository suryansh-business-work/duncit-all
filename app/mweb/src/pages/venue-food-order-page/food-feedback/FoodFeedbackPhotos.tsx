import { useRef, type ChangeEvent } from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import AddPhotoIcon from '@mui/icons-material/AddAPhotoOutlined';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { FOOD_FEEDBACK_LIMITS } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  /** One photo up; its address back, or null when it could not be uploaded. */
  onUpload: (file: File) => Promise<string | null>;
  uploading: boolean;
  disabled: boolean;
  /** The schema's complaint about the photos, when it has one. */
  error?: string;
}

const THUMB = 72;

/**
 * The feedback form's photos: what was added, each with a remove, and an Add
 * button until the limit is reached. The picker takes images only; on a phone
 * it offers the camera as well as the gallery.
 */
export default function FoodFeedbackPhotos({ images, onChange, onUpload, uploading, disabled, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const full = images.length >= FOOD_FEEDBACK_LIMITS.imagesMax;

  const picked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared first, so choosing the same photo again after a failed upload fires a change.
    event.target.value = '';
    if (!file) return;
    const url = await onUpload(file);
    if (url) onChange([...images, url]);
  };

  return (
    <Stack spacing={1} data-testid="food-feedback-photos">
      <Stack>
        <Typography component="h4" variant="body2" sx={{ fontWeight: 600 }}>
          {t('mweb.venueFood.feedback.photos')}
        </Typography>
        <FormHelperText sx={{ mt: 0 }}>
          {t('mweb.venueFood.feedback.photosHint', { vars: { max: String(FOOD_FEEDBACK_LIMITS.imagesMax) } })}
        </FormHelperText>
      </Stack>
      {images.length > 0 && (
        <Stack component="ul" direction="row" sx={{ listStyle: 'none', m: 0, p: 0, gap: 1, flexWrap: 'wrap' }}>
          {images.map((url, index) => (
            <Box key={url} component="li" sx={{ position: 'relative', width: THUMB, height: THUMB }}>
              <Box
                component="img"
                src={url}
                alt={t('mweb.venueFood.feedback.photoAlt', { vars: { number: String(index + 1) } })}
                sx={{ width: 1, height: 1, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }}
              />
              <DuncitIconButton
                size="small"
                aria-label={t('mweb.venueFood.feedback.removePhoto', { vars: { number: String(index + 1) } })}
                disabled={disabled}
                onClick={() => onChange(images.filter((image) => image !== url))}
                sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', boxShadow: 1 }}
                data-testid={`food-feedback-photo-remove-${index}`}
              >
                <CloseIcon fontSize="inherit" />
              </DuncitIconButton>
            </Box>
          ))}
        </Stack>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={picked}
        data-testid="food-feedback-photo-input"
      />
      {!full && (
        <DuncitButton
          variant="outlined"
          size="small"
          startIcon={<AddPhotoIcon />}
          loading={uploading}
          disabled={disabled || uploading}
          onClick={() => input.current?.click()}
          sx={{ alignSelf: 'flex-start' }}
          data-testid="food-feedback-photo-add"
        >
          {t(uploading ? 'mweb.venueFood.feedback.uploading' : 'mweb.venueFood.feedback.addPhoto')}
        </DuncitButton>
      )}
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
}
