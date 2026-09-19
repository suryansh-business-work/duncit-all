import { useId, useRef, useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../shared/i18n';
import { uploadImage } from '../lib/upload';
import { LiteImage } from './LiteImage';

interface CoverUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** The preview's shape: a wide cover or a square avatar. */
  shape?: 'cover' | 'avatar';
  hint?: string;
  error?: string;
  testId?: string;
}

const SHAPES = { cover: { width: 640, height: 360, max: 480 }, avatar: { width: 160, height: 160, max: 160 } } as const;

/** Pick a picture from the device (uploaded to the API) or paste a URL; shows the result with the bundled fallback behind it. */
export function CoverUploader({ label, value, onChange, shape = 'cover', hint, error, testId = 'cover-uploader' }: Readonly<CoverUploaderProps>) {
  const { t } = useWebT();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const size = SHAPES[shape];

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      notifyError(parseApiError(err, t('liteWeb.upload.failed')));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Stack spacing={1.5} data-testid={testId}>
      <Typography component="p" variant="subtitle2" id={`${inputId}-label`}>
        {label}
      </Typography>
      {value ? (
        <Box sx={{ position: 'relative', maxWidth: size.max }}>
          <LiteImage src={value} alt="" width={size.width} height={size.height} eager sx={{ borderRadius: 3 }} testId={`${testId}-preview`} />
          <DuncitIconButton
            aria-label={t('liteWeb.upload.remove')}
            onClick={() => onChange('')}
            size="small"
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper' }}
            data-testid={`${testId}-remove`}
          >
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Box>
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
        <DuncitButton
          variant="outlined"
          startIcon={<UploadFileIcon />}
          loading={busy}
          onClick={() => fileRef.current?.click()}
          sx={{ flexShrink: 0 }}
          data-testid={`${testId}-pick`}
        >
          {t('liteWeb.upload.choose')}
        </DuncitButton>
        {/* MUI has no file control; the native one stays off-screen behind the button above. */}
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept="image/*"
          aria-labelledby={`${inputId}-label`}
          onChange={(event) => pick(event.target.files?.[0])}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          tabIndex={-1}
        />
        <TextField
          label={t('liteWeb.upload.urlLabel')}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          fullWidth
          size="small"
          error={Boolean(error)}
          helperText={error ?? hint ?? t('liteWeb.upload.urlHint')}
          slotProps={{ htmlInput: { 'data-testid': `${testId}-url`, inputMode: 'url' } }}
        />
      </Stack>
    </Stack>
  );
}
