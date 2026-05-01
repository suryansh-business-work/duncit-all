import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ImageIcon from '@mui/icons-material/Image';
import MediaPickerDialog from './MediaPickerDialog';

interface Props {
  label: string;
  /** Newline-separated URLs (matches existing `feature_text` / `media_text` fields). */
  value: string;
  onChange: (next: string) => void;
  folder?: string;
  helperText?: string;
}

/**
 * Edit an ordered list of image URLs stored as one URL per line. Each item
 * exposes Pick / Move / Delete. Picking opens the unified MediaPickerDialog.
 */
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
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setPickerOpen('new')}
        >
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
            <Stack
              key={`${url}-${i}`}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1,
              }}
            >
              <Box
                component="img"
                src={url}
                alt=""
                sx={{
                  width: 56,
                  height: 56,
                  objectFit: 'cover',
                  borderRadius: 0.5,
                  bgcolor: 'action.hover',
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {url}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  #{i + 1}
                </Typography>
              </Box>
              <Tooltip title="Replace">
                <IconButton size="small" onClick={() => setPickerOpen(i)}>
                  <ImageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Move up">
                <span>
                  <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move down">
                <span>
                  <IconButton
                    size="small"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Remove">
                <IconButton size="small" color="error" onClick={() => remove(i)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
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
