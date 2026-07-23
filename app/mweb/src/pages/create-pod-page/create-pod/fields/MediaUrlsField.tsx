import { useState } from 'react';
import { Box, FormHelperText, IconButton, Stack, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import VideocamIcon from '@mui/icons-material/Videocam';
import MediaPickerDialog from '../../../../components/MediaPickerDialog';
import { requiredLabel } from '../../../../forms/components/requiredLabel';

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

interface Props {
  value: string;
  onChange: (text: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  folder?: string;
}

/** Pod media — a dashed upload dropzone (empty state) that opens the shared
 * MediaPickerDialog (device + Pexels); picked URLs render as a thumbnail strip
 * with an add-more tile. Controlled by media_text (URLs joined by newlines),
 * so create-pod and the host Edit Pod dialog share it (B3-9 dynamic pattern). */
export default function MediaUrlsField({
  value,
  onChange,
  error,
  label = 'Cover image',
  required = true,
  folder = '/pods',
}: Readonly<Props>) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const urls = splitLines(value ?? '');
  const addUrl = (url: string) => onChange([...urls, url].join('\n'));
  const removeUrl = (url: string) => onChange(urls.filter((item) => item !== url).join('\n'));
  const openPicker = () => setPickerOpen(true);
  const openOnKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 900, letterSpacing: '0.06em' }}
      >
        {requiredLabel(label, required)}
      </Typography>
      {urls.length === 0 ? (
        <Box
          role="button"
          tabIndex={0}
          aria-label="Upload an image"
          onClick={openPicker}
          onKeyDown={openOnKey}
          sx={{
            mt: 1,
            cursor: 'pointer',
            borderRadius: 3,
            border: '2px dashed',
            borderColor: error ? 'error.main' : 'divider',
            bgcolor: 'action.hover',
            px: 2,
            py: 4,
            display: 'grid',
            placeItems: 'center',
            gap: 1,
            textAlign: 'center',
            transition: 'border-color 160ms ease',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
            <AddPhotoAlternateOutlinedIcon color="primary" />
          </Box>
          <Typography variant="subtitle2" fontWeight={800}>Upload an image</Typography>
          <Typography variant="caption" color="text.secondary">Min 800×400px (JPG, PNG)</Typography>
        </Box>
      ) : (
        <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
          {urls.map((url) => (
            <Box key={url} sx={{ position: 'relative', width: 88, height: 88, borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider', bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}>
              {VIDEO_URL_RE.test(url) ? (
                <VideocamIcon color="action" />
              ) : (
                <Box component="img" src={url} alt="Pod media" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <IconButton
                size="small"
                aria-label="Remove media"
                onClick={() => removeUrl(url)}
                sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
          <Box
            role="button"
            tabIndex={0}
            aria-label="Add media"
            onClick={openPicker}
            onKeyDown={openOnKey}
            sx={{ cursor: 'pointer', width: 88, height: 88, borderRadius: 2, border: '2px dashed', borderColor: 'divider', display: 'grid', placeItems: 'center', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
          >
            <AddIcon />
          </Box>
        </Stack>
      )}
      {error && <FormHelperText error>{error}</FormHelperText>}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder={folder}
        title="Add pod media"
        onPicked={addUrl}
      />
    </Box>
  );
}
