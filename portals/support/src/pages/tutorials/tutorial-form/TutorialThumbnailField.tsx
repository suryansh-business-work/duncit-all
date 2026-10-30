import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import { DuncitButton } from '@duncit/buttons';
import { MediaPickerDialog } from '@duncit/media-picker';
import { useTranslation } from '@duncit/shell';

interface Props {
  value: string;
  onChange: (url: string) => void;
}

/** The tutorial's optional cover: one button opens the shared upload dialog
 * (device or Pexels photo); a picked cover shows above it with a Remove. */
export default function TutorialThumbnailField({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="subtitle2" component="span">
        {t('support.tutorials.fieldThumbnail')}
      </Typography>
      {value && (
        <Box
          component="img"
          src={value}
          alt={t('support.tutorials.fieldThumbnail')}
          sx={{ width: 140, aspectRatio: '9 / 16', borderRadius: 1, bgcolor: 'grey.900', objectFit: 'cover' }}
        />
      )}
      <Stack direction="row" spacing={1}>
        <DuncitButton variant="outlined" startIcon={<ImageIcon />} onClick={() => setOpen(true)}>
          {value ? t('support.tutorials.replaceThumbnail') : t('support.tutorials.chooseThumbnail')}
        </DuncitButton>
        {value && (
          <DuncitButton variant="text" color="error" onClick={() => onChange('')}>
            {t('support.tutorials.removeThumbnail')}
          </DuncitButton>
        )}
      </Stack>
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onPicked={(url) => {
          onChange(url);
          setOpen(false);
        }}
        accept="image/*"
        orientation="portrait"
        folder="/support/tutorials/thumbnails"
        title={t('support.tutorials.fieldThumbnail')}
      />
    </Stack>
  );
}
