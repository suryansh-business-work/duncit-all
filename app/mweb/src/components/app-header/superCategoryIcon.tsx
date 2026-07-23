import { Box } from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';

const isImageIcon = (value: string | null | undefined) => {
  const next = (value ?? '').trim();
  return /^data:image\//i.test(next) || /^https?:\/\//i.test(next) || next.startsWith('/');
};

const resolveMuiIcon = (name: string) =>
  (MuiIcons as Record<string, SvgIconComponent>)[name] || null;

/**
 * Render a super/category `icon` value (image URL, MUI icon name or emoji) as a
 * node. `size` (px) is the icon width — default 18 for the compact header chips;
 * the home vibe tabber passes a larger value for a full-bleed icon. `height`
 * defaults to `size` (square); pass it for a non-square image (icon layout). The
 * MUI-icon / emoji variants use the larger of width/height as their font size.
 */
export function renderSuperCategoryMark(icon: string | null | undefined, size = 18, height = size) {
  const next = (icon ?? '').trim();
  if (!next) return null;
  const fontSize = Math.max(size, height);
  if (isImageIcon(next)) {
    return (
      <Box
        component="img"
        src={next}
        alt=""
        sx={{ width: size, height, objectFit: 'contain', borderRadius: 0.75, flex: '0 0 auto' }}
      />
    );
  }
  const MuiIcon = resolveMuiIcon(next);
  if (MuiIcon) return <MuiIcon sx={{ fontSize, flex: '0 0 auto' }} />;
  return next.length <= 2 ? (
    <Box component="span" sx={{ lineHeight: 1, fontSize, flex: '0 0 auto' }}>
      {next}
    </Box>
  ) : null;
}
