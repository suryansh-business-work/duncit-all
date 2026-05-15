import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { Box, CircularProgress } from '@mui/material';

interface Props {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  height?: number | string;
  width?: number | string;
  style?: React.CSSProperties;
  onComplete?: () => void;
}

const cache = new Map<string, any>();

export default function LottiePlayer({
  src,
  loop = true,
  autoplay = true,
  height = '100%',
  width = '100%',
  style,
  onComplete,
}: Props) {
  const [data, setData] = useState<any>(cache.get(src) ?? null);

  useEffect(() => {
    if (!src) {
      setData(null);
      return;
    }
    if (cache.has(src)) {
      setData(cache.get(src));
      return;
    }
    let alive = true;
    fetch(src)
      .then((r) => r.json())
      .then((j) => {
        cache.set(src, j);
        if (alive) setData(j);
      })
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [src]);

  if (!data) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width, height }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      style={{ width, height, ...style }}
      onComplete={onComplete}
    />
  );
}
