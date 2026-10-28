import { useId, useState } from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { STORAGE_KEYS } from '../env';
import { useCommonT } from '../i18n';
import { LiteImage } from '../LiteImage';
import { SHAPES, type PictureShape } from './picture.types';
import { PictureDialog } from './PictureDialog';

export interface PictureFieldProps {
  label: string;
  /** The picture's URL; '' when there is none. */
  value: string;
  onChange: (url: string) => void;
  /** The preview's shape, which also sets the aspect ratio the picker recommends. */
  shape?: PictureShape;
  hint?: string;
  error?: string;
  disabled?: boolean;
  /** The storage slot of the session token the upload is sent with: the web app's by default, the console passes its own. */
  tokenKey?: string;
  testId?: string;
}

/**
 * A cover, square cover or avatar: the current picture with a remove button,
 * and one button that opens the picker (device upload or stock photos). A link
 * cannot be typed in; every picture goes through the upload route or the import.
 */
export function PictureField({ label, value, onChange, shape = 'cover', hint, error, disabled = false, tokenKey = STORAGE_KEYS.token, testId = 'picture-field' }: Readonly<PictureFieldProps>) {
  const { t } = useCommonT();
  const labelId = useId();
  const helperId = useId();
  const [open, setOpen] = useState(false);
  const size = SHAPES[shape];
  const helper = error ?? hint;

  return (
    <Stack spacing={1.5} role="group" aria-labelledby={labelId} data-testid={testId}>
      <Typography component="p" variant="subtitle2" id={labelId}>
        {label}
      </Typography>
      {value ? (
        <Box sx={{ position: 'relative', maxWidth: size.max }}>
          <LiteImage src={value} alt="" width={size.width} height={size.height} eager sx={{ borderRadius: 3 }} testId={`${testId}-preview`} />
          <DuncitIconButton
            aria-label={t('lite.picture.remove')}
            onClick={() => onChange('')}
            disabled={disabled}
            size="small"
            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper' }}
            data-testid={`${testId}-remove`}
          >
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Box>
      ) : null}
      <DuncitButton
        variant="outlined"
        startIcon={<ImageOutlinedIcon />}
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-describedby={helper ? helperId : undefined}
        sx={{ alignSelf: 'flex-start' }}
        data-testid={`${testId}-pick`}
      >
        {value ? t('lite.picture.change') : t('lite.picture.choose')}
      </DuncitButton>
      {helper ? (
        <FormHelperText id={helperId} error={Boolean(error)} role={error ? 'alert' : undefined} sx={{ mt: 0 }}>
          {helper}
        </FormHelperText>
      ) : null}
      <PictureDialog
        open={open}
        onClose={() => setOpen(false)}
        onPicked={(url) => {
          onChange(url);
          setOpen(false);
        }}
        shape={shape}
        tokenKey={tokenKey}
        testId={`${testId}-dialog`}
      />
    </Stack>
  );
}
