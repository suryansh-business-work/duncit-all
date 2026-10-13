import { useState } from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import MediaPickerDialog from '../../../../components/MediaPickerDialog';

interface Props {
  images: string[];
  /** The most photos one dish may carry — from the registration config. */
  limit: number;
  /** The dish's name, for the photos' alt text and the buttons' labels. */
  dishName: string;
  error?: string;
  onChange: (images: string[]) => void;
}

/** A dish's photos: thumbnails with a remove button each, and the picker to add one. */
export default function FoodItemPhotos({ images, limit, dishName, error, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const name = dishName.trim() || t('partners.registerVenuePage.foodUntitledDish');
  const atLimit = images.length >= limit;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('partners.registerVenuePage.foodPhotos', { vars: { used: images.length, max: limit } })}
        </Typography>
        <DuncitButton
          size="small"
          startIcon={<AddPhotoAlternateIcon />}
          disabled={atLimit}
          aria-label={t('partners.registerVenuePage.foodAddPhotoFor', { vars: { name } })}
          onClick={() => setPickerOpen(true)}
        >
          {t('partners.registerVenuePage.foodAddPhoto')}
        </DuncitButton>
      </Stack>
      {images.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}>
          {images.map((url, index) => (
            <Box key={url} sx={{ position: 'relative', aspectRatio: '1 / 1' }}>
              <Box
                component="img"
                src={url}
                alt={t('partners.registerVenuePage.foodPhotoAlt', { vars: { name, n: index + 1 } })}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }}
              />
              <DuncitIconButton
                size="small"
                aria-label={t('partners.registerVenuePage.foodRemovePhoto', { vars: { name, n: index + 1 } })}
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
        folder="/venues/menu"
        title={t('partners.registerVenuePage.foodAddPhotoFor', { vars: { name } })}
      />
    </Stack>
  );
}
