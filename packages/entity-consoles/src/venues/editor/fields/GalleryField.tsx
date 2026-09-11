import { Box, ImageList, ImageListItem, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import type { VenueFormValues } from '../types';

/**
 * The venue's gallery: a plain list of URLs, shown as what it is.
 *
 * `useFieldArray` is deliberately not used — it keys on an object id per row,
 * and these rows are bare strings. Reading and writing the whole array through
 * one Controller keeps the order the admin sees the order that is saved.
 */
export default function GalleryField({
  control,
  onPick,
}: Readonly<{ control: Control<VenueFormValues>; onPick: () => Promise<string | null> }>) {
  const { t } = useTranslation();

  return (
    <Controller
      control={control}
      name="gallery"
      render={({ field }) => {
        const urls = field.value ?? [];
        return (
          <Stack spacing={1}>
            {urls.length === 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('directory.venueEditor.galleryEmpty')}
              </Typography>
            )}
            {urls.length > 0 && (
              <ImageList cols={4} gap={8} sx={{ m: 0 }}>
                {urls.map((url, index) => (
                  <ImageListItem key={url} sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={url}
                      alt={t('directory.venueEditor.galleryItemAlt')}
                      sx={{ borderRadius: 1, height: 110, objectFit: 'cover' }}
                    />
                    <DuncitIconButton
                      size="small"
                      aria-label={t('directory.venueEditor.removeImage')}
                      onClick={() => field.onChange(urls.filter((_, i) => i !== index))}
                      sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </DuncitIconButton>
                  </ImageListItem>
                ))}
              </ImageList>
            )}
            <DuncitButton
              startIcon={<AddPhotoAlternateIcon />}
              sx={{ alignSelf: 'flex-start' }}
              onClick={async () => {
                const url = await onPick();
                if (url) field.onChange([...urls, url]);
              }}
            >
              {t('directory.venueEditor.addImage')}
            </DuncitButton>
          </Stack>
        );
      }}
    />
  );
}
