import { Box, ImageList, ImageListItem, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import type { VenueFormValues } from '../types';

/** The gallery without the image at `index`, everything else in its order. */
const withoutIndex = (urls: readonly string[], index: number): string[] =>
  urls.filter((_, i) => i !== index);

/** The lists of bare image URLs a venue holds: its gallery, and each dish's photos. */
export type GalleryFieldName = 'gallery' | `food_menu.${number}.images`;

/**
 * The venue's gallery: a plain list of URLs, shown as what it is.
 *
 * `useFieldArray` is deliberately not used — it keys on an object id per row,
 * and these rows are bare strings. Reading and writing the whole array through
 * one Controller keeps the order the admin sees the order that is saved.
 *
 * A dish's photos are the same list under another name, so the menu reuses this
 * with its own `name`, wording and the server's per-dish `limit`.
 */
export default function GalleryField({
  control,
  onPick,
  name = 'gallery',
  limit,
  emptyText,
  itemAlt,
}: Readonly<{
  control: Control<VenueFormValues>;
  onPick: () => Promise<string | null>;
  name?: GalleryFieldName;
  /** The most images this list may hold; adding stops there. Unset = no cap. */
  limit?: number;
  emptyText?: string;
  itemAlt?: string;
}>) {
  const { t } = useTranslation();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const urls = field.value ?? [];
        return (
          <Stack spacing={1}>
            {urls.length === 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {emptyText ?? t('directory.venueEditor.galleryEmpty')}
              </Typography>
            )}
            {urls.length > 0 && (
              <ImageList cols={4} gap={8} sx={{ m: 0 }}>
                {urls.map((url, index) => (
                  <ImageListItem key={url} sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={url}
                      alt={itemAlt ?? t('directory.venueEditor.galleryItemAlt')}
                      sx={{ borderRadius: 1, height: 110, objectFit: 'cover' }}
                    />
                    <DuncitIconButton
                      size="small"
                      aria-label={t('directory.venueEditor.removeImage')}
                      onClick={() => field.onChange(withoutIndex(urls, index))}
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
              disabled={limit !== undefined && urls.length >= limit}
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
