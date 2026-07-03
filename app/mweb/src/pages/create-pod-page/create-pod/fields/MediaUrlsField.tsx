import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Box, FormHelperText, IconButton, Stack, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import VideocamIcon from '@mui/icons-material/Videocam';
import MediaPickerDialog from '../../../../components/MediaPickerDialog';
import type { CreatePodForm } from '../create-pod.types';

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

interface Props {
  form: CreatePodForm;
}

/** Pod cover media — a dashed upload dropzone (empty state) that opens the shared
 * MediaPickerDialog (device + Pexels); picked URLs render as a thumbnail strip
 * with an add-more tile. URLs serialize into media_text (B3-9 dynamic pattern). */
export default function MediaUrlsField({ form }: Readonly<Props>) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <Controller
      control={form.control}
      name="media_text"
      render={({ field, fieldState }) => {
        const urls = splitLines(field.value ?? '');
        const addUrl = (url: string) => field.onChange([...urls, url].join('\n'));
        const removeUrl = (url: string) => field.onChange(urls.filter((item) => item !== url).join('\n'));
        return (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: '0.06em' }}>
              Cover image *
            </Typography>
            {urls.length === 0 ? (
              <Box
                role="button"
                tabIndex={0}
                aria-label="Upload an image"
                onClick={() => setPickerOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPickerOpen(true);
                  }
                }}
                sx={{
                  mt: 1,
                  cursor: 'pointer',
                  borderRadius: 3,
                  border: '2px dashed',
                  borderColor: fieldState.error ? 'error.main' : 'divider',
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
                  onClick={() => setPickerOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPickerOpen(true);
                    }
                  }}
                  sx={{ cursor: 'pointer', width: 88, height: 88, borderRadius: 2, border: '2px dashed', borderColor: 'divider', display: 'grid', placeItems: 'center', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
                >
                  <AddIcon />
                </Box>
              </Stack>
            )}
            {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
            <MediaPickerDialog
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              folder="/pods"
              title="Add pod media"
              onPicked={addUrl}
            />
          </Box>
        );
      }}
    />
  );
}
