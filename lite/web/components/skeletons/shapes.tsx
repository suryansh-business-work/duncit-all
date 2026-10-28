import type { ReactNode } from 'react';
import { Box, Skeleton } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useWebT } from '../../../shared/i18n';

type Size = number | string | Partial<Record<'xs' | 'sm' | 'md' | 'lg', number | string>>;
type Typo = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'body1' | 'body2' | 'caption';

/** `count` stable keys for a run of placeholders, so no list keys on the map index. */
export const slots = (prefix: string, count: number): string[] => Array.from({ length: count }, (_, at) => `${prefix}-${at}`);

/**
 * Where every Lite skeleton sits: announced once as "Loading…", exactly like
 * the spinner it replaces, with its grey shapes hidden from screen readers.
 */
export function SkeletonFrame({ children, sx, testId = 'skeleton' }: Readonly<{ children: ReactNode; sx?: SxProps<Theme>; testId?: string }>) {
  const { t } = useWebT();
  return (
    <Box role="status" aria-label={t('lite.common.loading')} aria-busy sx={sx} data-testid={testId}>
      <Box aria-hidden>{children}</Box>
    </Box>
  );
}

/** A line of text in one of the theme's type styles, about as wide as the words it stands for. */
export function TextLine({ width = '100%', typo = 'body1' }: Readonly<{ width?: Size; typo?: Typo }>) {
  return <Skeleton variant="text" sx={{ width, typography: typo }} />;
}

interface ShapeProps {
  width?: Size;
  height?: Size;
  /** Width / height, for a picture that scales with its column. */
  ratio?: string;
  /** As sx takes it: theme units for a number, or a CSS length. */
  radius?: number | string;
}

/** A picture, a field or a panel. */
export function Shape({ width = '100%', height, ratio, radius = 2 }: Readonly<ShapeProps>) {
  return <Skeleton variant="rounded" sx={{ width, height, aspectRatio: ratio, borderRadius: radius, flexShrink: 0 }} />;
}

/** An avatar or a round icon. */
export function Dot({ size }: Readonly<{ size: number }>) {
  return <Skeleton variant="circular" width={size} height={size} sx={{ flexShrink: 0 }} />;
}
