import { useState } from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { MediaPickerDialog, type UploadSurface } from '@duncit/media-picker';

/** Where a dish photo is filed: the venue's own media folder (the server adds the venue id). */
export const FOOD_PHOTO_FOLDER = '/venues';

export interface FoodPhotoUpload {
  /**
   * The venue the photos belong to — the upload's entity, so they land in that
   * venue's folder. A venue not saved yet has none; the server parks those
   * under the uploader until the media organizer files them.
   */
  venueId?: string;
  /** The Upload Settings surface the picker caps and compresses for. */
  surface: UploadSurface;
}

interface Props extends FoodPhotoUpload {
  images: string[];
  /** The most photos one dish may carry — from the registration config. */
  limit: number;
  /** The dish's name, for the photos' alt text and the buttons' labels. */
  dishName: string;
  error?: string;
  onChange: (images: string[]) => void;
}

/** A dish's photos: thumbnails with a remove button each, and the shared picker to add one. */
export default function FoodDishPhotos({ images, limit, dishName, error, onChange, venueId, surface }: Readonly<Props>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const name = dishName.trim() || t('venueFoodOwner.menu.untitledDish');
  const atLimit = images.length >= limit;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('venueFoodOwner.menu.photos', { vars: { used: images.length, max: limit } })}
        </Typography>
        <DuncitButton
          size="small"
          startIcon={<AddPhotoAlternateIcon />}
          disabled={atLimit}
          aria-label={t('venueFoodOwner.menu.addPhotoFor', { vars: { name } })}
          onClick={() => setPickerOpen(true)}
        >
          {t('venueFoodOwner.menu.addPhoto')}
        </DuncitButton>
      </Stack>
      {images.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}>
          {images.map((url, index) => (
            <Box key={url} sx={{ position: 'relative', aspectRatio: '1 / 1' }}>
              <Box
                component="img"
                src={url}
                alt={t('venueFoodOwner.menu.photoAlt', { vars: { name, n: index + 1 } })}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }}
              />
              <DuncitIconButton
                size="small"
                aria-label={t('venueFoodOwner.menu.removePhoto', { vars: { name, n: index + 1 } })}
                onClick={() => onChange(images.filter((_url, itemIndex) => itemIndex !== index))}
                sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
              >
                <DeleteIcon fontSize="small" />
              </DuncitIconButton>
            </Box>
          ))}
        </Box>
      )}
      {error && <FormHelperText error>{error}</FormHelperText>}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={(url) => {
          onChange(Array.from(new Set([...images, url])));
          setPickerOpen(false);
        }}
        folder={FOOD_PHOTO_FOLDER}
        entityId={venueId}
        surface={surface}
        accept="image/*"
        title={t('venueFoodOwner.menu.addPhotoFor', { vars: { name } })}
      />
    </Stack>
  );
}
