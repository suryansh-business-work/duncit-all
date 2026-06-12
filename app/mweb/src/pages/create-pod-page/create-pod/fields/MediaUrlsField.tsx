import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Box, Button, FormHelperText, IconButton, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
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

/** Pod media — upload via the shared MediaPickerDialog (device + Pexels) into
 * a thumbnail list; URLs serialize into media_text, same dynamic component
 * pattern as the mobile app (B3-9). */
export default function MediaUrlsField({ form }: Readonly<Props>) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <Controller
      control={form.control}
      name="media_text"
      render={({ field, fieldState }) => {
        const urls = splitLines(field.value ?? '');
        const removeUrl = (url: string) =>
          field.onChange(urls.filter((item) => item !== url).join('\n'));
        return (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Pod media (at least one image)
            </Typography>
            {urls.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                {urls.map((url) => (
                  <Box
                    key={url}
                    sx={{
                      position: 'relative',
                      width: 84,
                      height: 84,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
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
              </Stack>
            )}
            <Button
              startIcon={<AddPhotoAlternateIcon />}
              variant="outlined"
              size="small"
              onClick={() => setPickerOpen(true)}
              sx={{ mt: 1, borderRadius: 999, fontWeight: 900 }}
            >
              Add media
            </Button>
            {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
            <MediaPickerDialog
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              folder="/pods"
              title="Add pod media"
              onPicked={(url) => field.onChange([...urls, url].join('\n'))}
            />
          </Box>
        );
      }}
    />
  );
}
