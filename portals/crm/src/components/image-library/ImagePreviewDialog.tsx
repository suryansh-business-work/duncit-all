import { Box, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  /** The image to show; null closes the dialog. */
  image: { url: string; name: string; meta?: string } | null;
  onClose: () => void;
}

/** A full-size look at one uploaded image, with a link to the original file. */
export default function ImagePreviewDialog({ image, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = image?.name || t('crm.media.untitled');
  return (
    <Dialog open={!!image} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Typography component="span" variant="h6" noWrap sx={{ display: 'block' }}>
          {name}
        </Typography>
        {image?.meta && (
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {image.meta}
          </Typography>
        )}
        <DuncitIconButton
          aria-label={t('shell.common.close')}
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          {image && (
            <Box
              component="img"
              src={image.url}
              alt={name}
              sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 1 }}
            />
          )}
          {image && (
            <DuncitButton
              size="small"
              startIcon={<OpenInNewIcon />}
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('crm.media.openOriginal')}
            </DuncitButton>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
