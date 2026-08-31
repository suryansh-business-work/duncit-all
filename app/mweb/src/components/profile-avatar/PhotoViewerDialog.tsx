import { Box, Dialog } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitRoundButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  src: string | null;
  onClose: () => void;
}

/** Full-screen profile-photo viewer (item 9 — View Photo). */
export default function PhotoViewerDialog({ open, src, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open && !!src}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { bgcolor: '#08070b' } }
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <DuncitRoundButton
          size="large"
          tone="overlay"
          aria-label={t('mweb.profileAvatar.closePhoto')}
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
        >
          <CloseIcon />
        </DuncitRoundButton>
        {src && (
          <Box
            component="img"
            src={src}
            alt={t('mweb.profileAvatar.profilePhoto')}
            sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
          />
        )}
      </Box>
    </Dialog>
  );
}
