import { Box, Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { SignatureMethod } from '../../graphql/documents';

interface Props {
  upload: (file?: File | null) => void;
  value: string;
  method: SignatureMethod | null;
}

/** Picture-of-a-signature upload with a preview. */
export function UploadPanel({ upload, value, method }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} sx={{
      alignItems: "flex-start"
    }}>
      <DuncitButton component="label" variant="outlined" startIcon={<UploadFileIcon />}>
        Choose image{' '}
        <input
          hidden
          type="file"
          accept="image/*"
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </DuncitButton>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        PNG or JPG, under 5 MB.
      </Typography>
      {value && method === 'UPLOAD' && (
        <Box
          component="img"
          src={value}
          alt={t('legal.signature.uploadedPreview')}
          sx={{ height: 80, objectFit: 'contain' }}
        />
      )}
    </Stack>
  );
}
