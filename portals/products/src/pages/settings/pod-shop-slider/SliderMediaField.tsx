import { useState } from 'react';
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { describeAttachment } from '@duncit/media-picker';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import type { SliderMedia } from './queries';

interface Props {
  media: SliderMedia[];
  onChange: (media: SliderMedia[]) => void;
}

/** Ordered list of Pod Shop slider media (images + videos). Adds via the shared
 * media picker (device upload / Pexels), classifies each URL by kind, and lets
 * the admin reorder (arrows) and remove. The array order IS the slide order. */
export default function SliderMediaField({ media, onChange }: Readonly<Props>) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePicked = (url: string) => {
    setPickerOpen(false);
    if (media.some((m) => m.url === url)) return;
    const kind = describeAttachment(url).kind;
    onChange([...media, { url, type: kind === 'video' ? 'VIDEO' : 'IMAGE' }]);
  };

  const remove = (url: string) => onChange(media.filter((m) => m.url !== url));

  const update = (index: number, patch: Partial<SliderMedia>) => {
    const next = [...media];
    const current = next[index];
    if (!current) return;
    next[index] = { ...current, ...patch };
    onChange(next);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    onChange(next);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Slider media (images &amp; videos)</Typography>
        <Button
          size="small"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => setPickerOpen(true)}
        >
          Add media
        </Button>
      </Stack>
      {media.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            No slider media yet — add images or videos to show at the top of the Pod Shop.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {media.map((item, index) => (
            <Stack
              key={item.url}
              spacing={1}
              sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
              {item.type === 'VIDEO' ? (
                <Box
                  component="video"
                  src={item.url}
                  muted
                  sx={{
                    width: 72,
                    height: 48,
                    objectFit: 'cover',
                    borderRadius: 1,
                    bgcolor: 'black',
                  }}
                />
              ) : (
                <Box
                  component="img"
                  src={item.url}
                  alt="slide"
                  sx={{
                    width: 72,
                    height: 48,
                    objectFit: 'cover',
                    borderRadius: 1,
                  }}
                />
              )}
              <Typography variant="caption" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                {item.type} · {item.url}
              </Typography>
              <Tooltip title="Move up">
                <span>
                  <IconButton
                    size="small"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUpwardIcon fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move down">
                <span>
                  <IconButton
                    size="small"
                    aria-label="Move down"
                    disabled={index === media.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDownwardIcon fontSize="inherit" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Remove">
                <IconButton size="small" aria-label="Remove" onClick={() => remove(item.url)}>
                  <DeleteOutlineIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  size="small"
                  label="Heading"
                  value={item.heading ?? ''}
                  onChange={(e) => update(index, { heading: e.target.value })}
                  fullWidth
                  placeholder="Gear Up Your Game"
                />
                <TextField
                  size="small"
                  label="Subheading"
                  value={item.subheading ?? ''}
                  onChange={(e) => update(index, { subheading: e.target.value })}
                  fullWidth
                  placeholder="Top picks for every champion."
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  size="small"
                  label="CTA label"
                  value={item.cta_label ?? ''}
                  onChange={(e) => update(index, { cta_label: e.target.value })}
                  fullWidth
                  placeholder="Shop Now"
                />
                <TextField
                  size="small"
                  label="CTA link (URL or /path)"
                  value={item.cta_url ?? ''}
                  onChange={(e) => update(index, { cta_url: e.target.value })}
                  fullWidth
                  placeholder="/shop"
                />
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder="/pod-shop-slider"
        title="Add slider media (image or video)"
        onPicked={handlePicked}
      />
    </Box>
  );
}
