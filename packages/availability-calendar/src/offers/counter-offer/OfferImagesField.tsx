import { useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Box, FormHelperText, IconButton, Stack, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { VENUE_OFFER_IMAGES_MAX } from '@duncit/forms/schemas';
import { MediaPickerDialog } from '@duncit/media-picker';
import type { CounterOfferValues } from './counter-offer.types';

/**
 * Photos attached to a counter — the set-up, the menu, the space — picked one
 * at a time from the device: images only, never a stock library or a video
 * (the server refuses anything but an upload of ours). Up to
 * `VENUE_OFFER_IMAGES_MAX`; each can be taken back before sending.
 */
export default function OfferImagesField({ control }: Readonly<{ control: Control<CounterOfferValues> }>) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);

  return (
    <Controller
      control={control}
      name="images"
      render={({ field, fieldState }) => {
        const images = field.value ?? [];
        return (
          <Stack spacing={1} data-testid="offer-images-field">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('availability.offers.images.label')}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              {images.map((url, index) => (
                <Box key={url} sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={url}
                    alt={t('availability.offers.images.alt', { vars: { n: index + 1 } })}
                    sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1, display: 'block' }}
                  />
                  <IconButton
                    size="small"
                    aria-label={t('availability.offers.images.remove', { vars: { n: index + 1 } })}
                    onClick={() => field.onChange(images.filter((kept) => kept !== url))}
                    sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', boxShadow: 1 }}
                    data-testid={`offer-image-remove-${index}`}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              {images.length < VENUE_OFFER_IMAGES_MAX && (
                <DuncitButton
                  variant="outlined"
                  startIcon={<AddPhotoAlternateOutlinedIcon />}
                  onClick={() => setPicking(true)}
                  data-testid="offer-image-add"
                >
                  {t('availability.offers.images.add')}
                </DuncitButton>
              )}
            </Stack>
            <FormHelperText error={!!fieldState.error}>
              {fieldState.error?.message ?? t('availability.offers.images.hint', { vars: { max: VENUE_OFFER_IMAGES_MAX } })}
            </FormHelperText>
            <MediaPickerDialog
              open={picking}
              onClose={() => setPicking(false)}
              onPicked={(url: string) => field.onChange([...images.filter((kept) => kept !== url), url].slice(0, VENUE_OFFER_IMAGES_MAX))}
              accept="image/*"
              deviceOnly
              folder="/chat"
              title={t('availability.offers.images.pickerTitle')}
            />
          </Stack>
        );
      }}
    />
  );
}
