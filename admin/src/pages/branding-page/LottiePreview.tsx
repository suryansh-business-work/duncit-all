import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

interface Props {
  src: string;
  fallbackPath?: string;
  height?: number;
  caption?: string;
}

export default function LottiePreview({ src, fallbackPath, height = 140, caption }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const url = src || fallbackPath || '';
    if (!url) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setErr(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (alive) setData(j);
      })
      .catch((e) => {
        if (alive) setErr(e.message);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [src, fallbackPath]);

  return (
    <Stack alignItems="center" spacing={0.5} sx={{ width: '100%' }}>
      <Box
        sx={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {loading && <CircularProgress size={24} />}
        {!loading && err && (
          <Typography variant="caption" color="error">
            {err}
          </Typography>
        )}
        {!loading && !err && data && (
          <Lottie animationData={data} loop autoplay style={{ height: '100%', width: '100%' }} />
        )}
        {!loading && !err && !data && (
          <Typography variant="caption" color="text.secondary">
            No animation
          </Typography>
        )}
      </Box>
      {caption && (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
    </Stack>
  );
}
