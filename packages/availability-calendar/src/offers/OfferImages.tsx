import { useState } from 'react';
import { Box, ButtonBase, Dialog, IconButton, Stack } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from '@duncit/app-settings';

/**
 * The photos a side attached to its terms, as thumbnails; one opens full size
 * over the chat, where it closes again. Nothing when there are none.
 */
export default function OfferImages({ images }: Readonly<{ images: readonly string[] | null | undefined }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  const list = images ?? [];
  if (list.length === 0) return null;
  // A list that shrank while a photo was open shows nothing, rather than an empty viewer.
  const shown = open === null ? undefined : list[open];
  const shownNumber = (open ?? 0) + 1;

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} data-testid="offer-images">
        {list.map((url, index) => (
          <ButtonBase
            key={url}
            aria-label={t('availability.offers.images.open', { vars: { n: index + 1 } })}
            onClick={() => setOpen(index)}
            sx={{ borderRadius: 1, overflow: 'hidden', cursor: 'zoom-in' }}
          >
            <Box
              component="img"
              src={url}
              alt={t('availability.offers.images.alt', { vars: { n: index + 1 } })}
              sx={{ width: 64, height: 64, objectFit: 'cover', display: 'block' }}
            />
          </ButtonBase>
        ))}
      </Stack>
      <Dialog
        open={!!shown}
        onClose={() => setOpen(null)}
        maxWidth="md"
        slotProps={{ paper: { 'aria-label': t('availability.offers.images.label') } }}
      >
        <IconButton
          aria-label={t('availability.offers.chat.close')}
          onClick={() => setOpen(null)}
          sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper' }}
        >
          <CloseRoundedIcon />
        </IconButton>
        {shown && (
          <Box
            component="img"
            src={shown}
            alt={t('availability.offers.images.alt', { vars: { n: shownNumber } })}
            sx={{ display: 'block', maxWidth: '100%', maxHeight: '80vh' }}
          />
        )}
      </Dialog>
    </>
  );
}
