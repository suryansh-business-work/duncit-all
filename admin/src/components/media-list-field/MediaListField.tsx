import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ImageIcon from '@mui/icons-material/Image';
import MediaPickerDialog from '../MediaPickerDialog';
import MediaListRow from './MediaListRow';

interface Props {
  label: string;
  /** Newline-separated URLs (matches existing `feature_text` / `media_text` fields). */
  value: string;
  onChange: (next: string) => void;
  folder?: string;
  helperText?: string;
}

export default function MediaListField({
  label,
  value,
  onChange,
  folder,
  helperText,
}: Props) {
  const items = value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const [pickerOpen, setPickerOpen] = useState<number | 'new' | null>(null);

  const setAt = (i: number, url: string) => {
    const copy = [...items];
    copy[i] = url;
    onChange(copy.join('\n'));
  };
  const remove = (i: number) => {
    const copy = items.filter((_, idx) => idx !== i);
    onChange(copy.join('\n'));
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy.join('\n'));
  };
  const append = (url: string) => onChange([...items, url].join('\n'));

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">{label}</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setPickerOpen('new')}>
          Add image
        </Button>
      </Stack>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {helperText}
        </Typography>
      )}
      {items.length === 0 ? (
        <Box
          sx={{
            border: 1,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <ImageIcon sx={{ opacity: 0.5 }} />
          <Typography variant="caption" sx={{ display: 'block' }}>
            No images yet. Click <b>Add image</b> to upload or pick from Pexels.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {items.map((url, i) => (
            <MediaListRow
              key={`${url}-${i}`}
              url={url}
              index={i}
              total={items.length}
              onReplace={() => setPickerOpen(i)}
              onMove={(dir) => move(i, dir)}
              onRemove={() => remove(i)}
            />
          ))}
        </Stack>
      )}
      <MediaPickerDialog
        open={pickerOpen !== null}
        onClose={() => setPickerOpen(null)}
        folder={folder}
        title={pickerOpen === 'new' ? `Add to ${label}` : `Replace image in ${label}`}
        onPicked={(url) => {
          if (pickerOpen === 'new') append(url);
          else if (typeof pickerOpen === 'number') setAt(pickerOpen, url);
        }}
      />
    </Box>
  );
}
