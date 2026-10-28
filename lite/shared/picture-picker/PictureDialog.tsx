import { useId } from 'react';
import { Dialog, DialogContent, DialogTitle, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useCommonT } from '../i18n';
import type { PictureShape } from './picture.types';
import { PicturePicker } from './PicturePicker';

interface PictureDialogProps {
  open: boolean;
  onClose: () => void;
  onPicked: (url: string) => void;
  shape: PictureShape;
  tokenKey: string;
  testId: string;
}

/**
 * "Choose a picture": full screen on a phone, as tall as the window allows elsewhere, so only the
 * topic list and the photos scroll. Its body mounts only while open, so nothing is fetched before.
 */
export function PictureDialog({ open, onClose, onPicked, shape, tokenKey, testId }: Readonly<PictureDialogProps>) {
  const { t } = useCommonT();
  const titleId = useId();
  // The material useTheme answers the default theme without a provider, so the field also renders in a bare tree.
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={phone}
      fullWidth
      maxWidth="md"
      aria-labelledby={titleId}
      data-testid={testId}
      // The paper's own max-height keeps the margin round it.
      slotProps={{ paper: { sx: { height: '100%' } } }}
    >
      <DialogTitle id={titleId} sx={{ pr: 7, textAlign: 'center', fontWeight: 700 }}>
        {t('lite.picture.dialogTitle')}
        <DuncitIconButton aria-label={t('lite.common.close')} onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }} data-testid={`${testId}-close`}>
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column' }}>
        <PicturePicker shape={shape} tokenKey={tokenKey} onPicked={onPicked} />
      </DialogContent>
    </Dialog>
  );
}
