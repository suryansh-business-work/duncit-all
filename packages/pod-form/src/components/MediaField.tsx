import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ImageIcon from '@mui/icons-material/Image';
import MediaRow from './MediaRow';

interface Props {
  label: string;
  /** Newline-separated URLs. */
  value: string;
  onChange: (next: string) => void;
  helperText?: string;
  error?: string;
  /** When provided, a rich picker is used; otherwise a plain multiline textarea. */
  onPickImage?: () => Promise<string | null>;
}

/**
 * Media editor. With `onPickImage` it renders the reorderable image/video list
 * (admin behaviour); without it, a newline textarea (partner behaviour).
 */
export default function MediaField({ label, value, onChange, helperText, error, onPickImage }: Readonly<Props>) {
  const items = value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!onPickImage) {
    return (
      <TextField
        label={label}
        fullWidth
        multiline
        minRows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={!!error}
        helperText={error || helperText || 'One image or video URL per line.'}
      />
    );
  }

  const setAt = (i: number, url: string) => {
    const copy = [...items];
    copy[i] = url;
    onChange(copy.join('\n'));
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i).join('\n'));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    /* v8 ignore next -- defensive: MediaRow disables the reorder buttons at the list boundaries */
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy.join('\n'));
  };
  const append = (url: string) => onChange([...items, url].join('\n'));

  const pickInto = (target: number | 'new') => {
    onPickImage()
      .then((url) => {
        if (!url) return;
        if (target === 'new') append(url);
        else setAt(target, url);
      })
      .catch(() => undefined);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">{label}</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => pickInto('new')}>
          Add image
        </Button>
      </Stack>
      {(error || helperText) && (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ display: 'block', mb: 1 }}>
          {error || helperText}
        </Typography>
      )}
      {items.length === 0 ? (
        <Box
          sx={{ border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 1, p: 3, textAlign: 'center', color: 'text.secondary' }}
        >
          <ImageIcon sx={{ opacity: 0.5 }} />
          <Typography variant="caption" sx={{ display: 'block' }}>
            No images yet. Click <b>Add image</b> to upload or pick from Pexels.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {items.map((url, i) => (
            <MediaRow
              key={`${url}-${i}`}
              url={url}
              index={i}
              total={items.length}
              onReplace={() => pickInto(i)}
              onMove={(dir) => move(i, dir)}
              onRemove={() => remove(i)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
