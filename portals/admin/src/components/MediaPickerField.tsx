import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MediaPickerDialog from './MediaPickerDialog';
import { useTranslation } from '@duncit/shell';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  helperText?: string;
  required?: boolean;
  showPreview?: boolean;
  /** Render only a button (no underlying TextField). */
  buttonOnly?: boolean;
  buttonLabel?: string;
  /** Restrict what the picker offers, e.g. 'image/*' (default: images + videos). */
  accept?: string;
}

/**
 * A TextField + "Pick" button combo. Clicking the icon opens the unified
 * MediaPickerDialog so the user can either upload from device or pick a
 * Pexels photo. The resulting URL is stored in the field.
 */
export default function MediaPickerField({
  label,
  value,
  onChange,
  folder,
  helperText,
  required,
  showPreview = true,
  buttonOnly = false,
  buttonLabel = 'Choose image',
  accept,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (buttonOnly) {
    return (
      <>
        <Button
          variant="outlined"
          startIcon={<PhotoCameraIcon />}
          onClick={() => setOpen(true)}
        >
          {buttonLabel}
        </Button>
        <MediaPickerDialog
          open={open}
          onClose={() => setOpen(false)}
          onPicked={onChange}
          folder={folder}
          title={label}
          accept={accept}
        />
      </>
    );
  }

  return (
    <Stack spacing={1}>
      <TextField
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        fullWidth
        placeholder={t('admin.pickers.mediaHint')}
        helperText={helperText}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Tooltip title={t('admin.pickers.mediaPick')}>
                  <IconButton size="small" onClick={() => setOpen(true)}>
                    <ImageIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
            endAdornment: value ? (
              <InputAdornment position="end">
                <Tooltip title={t('admin.pickers.open')}>
                  <IconButton size="small" onClick={() => window.open(value, '_blank')}>
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : null,
          }
        }}
      />
      {showPreview && value && (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            component="img"
            src={value}
            alt="preview"
            sx={{
              width: 64,
              height: 64,
              objectFit: 'cover',
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              wordBreak: 'break-all'
            }}>
            {value}
          </Typography>
        </Box>
      )}
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onPicked={onChange}
        folder={folder}
        title={`Choose · ${label}`}
        accept={accept}
      />
    </Stack>
  );
}
