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
}: Props) {
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
        placeholder="Click the image icon to upload, or paste a URL…"
        helperText={helperText}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Tooltip title="Pick from device or Pexels">
                <IconButton size="small" onClick={() => setOpen(true)}>
                  <ImageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <Tooltip title="Open">
                <IconButton size="small" onClick={() => window.open(value, '_blank')}>
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ) : null,
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
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
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
      />
    </Stack>
  );
}
