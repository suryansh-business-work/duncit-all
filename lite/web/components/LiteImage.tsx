import { useState } from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { resolveIconSource } from '@duncit/fallback-icons';
import { mergeSx } from '@duncit/ui';
import { LITE_FALLBACK_ICONS } from '../../shared/fallback-icons';

interface LiteImageProps {
  src: string | null | undefined;
  alt: string;
  /** Intrinsic size: reserves the box before the bytes arrive, so nothing shifts. */
  width: number;
  height: number;
  /** Above-the-fold images load at once; everything else waits for the viewport. */
  eager?: boolean;
  sx?: SxProps<Theme>;
  testId?: string;
}

/**
 * A cover, avatar or city picture from a URL: lazy by default, and swapped
 * for the bundled placeholder when the URL is blank or fails to load.
 */
export function LiteImage({ src, alt, width, height, eager = false, sx, testId }: Readonly<LiteImageProps>) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { source } = resolveIconSource(src, LITE_FALLBACK_ICONS.placeholder, failedSrc !== null && failedSrc === src);
  return (
    <Box
      component="img"
      src={source}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(src ?? '')}
      data-testid={testId}
      sx={mergeSx({ display: 'block', width: '100%', height: 'auto', aspectRatio: `${width} / ${height}`, objectFit: 'cover', bgcolor: 'action.hover' }, sx)}
    />
  );
}
