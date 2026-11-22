import { useId } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';

export interface LightboxPhoto {
  url: string;
  /** The photo's accessible name, also the dialog's title. */
  label: string;
}

/** One proof photo, large. Esc, the backdrop and the close button all return focus to the thumbnail. */
export default function ProofPhotoLightbox({ photo, onClose }: Readonly<{ photo: LightboxPhoto | null; onClose: () => void }>) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Dialog open={photo !== null} onClose={onClose} maxWidth="lg" fullWidth aria-labelledby={titleId}>
      {photo && (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
            <DialogTitle id={titleId}>{photo.label}</DialogTitle>
            <DuncitIconButton aria-label={t('venueRentals.detail.close')} onClick={onClose} data-testid="rental-proof-lightbox-close">
              <CloseIcon />
            </DuncitIconButton>
          </Stack>
          <DialogContent dividers sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box
              component="img"
              src={photo.url}
              alt={photo.label}
              sx={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
            />
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
