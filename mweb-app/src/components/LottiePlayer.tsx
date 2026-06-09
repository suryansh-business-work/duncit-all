import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { Box, CircularProgress } from '@mui/material';

interface Props {
  src: string;
  fallbackSrc?: string;
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
  fallbackSrc,
  loop = true,
  autoplay = true,
  height = '100%',
  width = '100%',
  style,
  onComplete,
}: Readonly<Props>) {
  const [data, setData] = useState<any>(cache.get(src) ?? (fallbackSrc ? cache.get(fallbackSrc) : null) ?? null);

  useEffect(() => {
    if (!src) {
      setData(null);
      return;
    }
    const fallback = fallbackSrc && fallbackSrc !== src ? fallbackSrc : null;
    const cached = cache.get(src) ?? (fallback ? cache.get(fallback) : null);
    if (cached) {
      setData(cached);
      return;
    }
    let alive = true;
    const loadJson = async (url: string) => {
      const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const ct = r.headers.get('content-type') || '';
        const text = await r.text();
        if (ct.includes('text/html') || text.trim().startsWith('<')) {
          throw new Error('Not a JSON Lottie file');
        }
      return { json: JSON.parse(text), url };
    };
    loadJson(src)
      .catch(() => (fallback ? loadJson(fallback) : Promise.reject(new Error('Lottie unavailable'))))
      .then(({ json, url }) => {
        cache.set(url, json);
        if (alive) setData(json);
      })
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [src, fallbackSrc]);

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
