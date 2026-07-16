import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface Props {
  /** Reel video URL ('' = no reel). */
  value: string;
  onChange: (next: string) => void;
  error?: string;
  /** When provided, a video picker is used; otherwise a plain URL input. */
  onPickVideo?: () => Promise<string | null>;
}

const HELPER = 'Shows in Explore while the pod is live.';

function ReelBody({ value, onChange, error, onPickVideo }: Readonly<Props>) {
  if (value) {
    return (
      <Stack spacing={1}>
        <Box
          component="video"
          src={value}
          controls
          sx={{ width: '100%', maxHeight: 260, borderRadius: 1, bgcolor: 'common.black' }}
        />
        <Button
          size="small"
          color="error"
          startIcon={<DeleteOutlineIcon />}
          onClick={() => onChange('')}
          sx={{ alignSelf: 'flex-start' }}
        >
          Remove reel
        </Button>
      </Stack>
    );
  }
  if (onPickVideo) {
    return (
      <Box
        sx={{ border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 1, p: 3, textAlign: 'center', color: 'text.secondary' }}
      >
        <VideocamIcon sx={{ opacity: 0.5 }} />
        <Typography variant="caption" sx={{ display: 'block' }}>
          No reel yet. Click <b>Pick video</b> to upload or pick from Pexels.
        </Typography>
      </Box>
    );
  }
  return (
    <TextField
      label="Reel video URL"
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={!!error}
      helperText={error}
    />
  );
}

/**
 * Optional Explore reel video for the pod. With `onPickVideo` it renders a
 * pick-video button + inline preview; without it, a URL text field.
 */
export default function ReelField({ value, onChange, error, onPickVideo }: Readonly<Props>) {
  const pick = () => {
    onPickVideo?.()
      .then((url) => {
        if (url) onChange(url);
      })
      .catch(() => undefined);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Pod Reel</Typography>
        {onPickVideo && (
          <Button size="small" startIcon={<VideocamIcon />} onClick={pick}>
            {value ? 'Replace video' : 'Pick video'}
          </Button>
        )}
      </Stack>
      <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ display: 'block', mb: 1 }}>
        {error || HELPER}
      </Typography>
      <ReelBody value={value} onChange={onChange} error={error} onPickVideo={onPickVideo} />
    </Box>
  );
}
