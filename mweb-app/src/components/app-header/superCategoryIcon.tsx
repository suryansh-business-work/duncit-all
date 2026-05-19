import { Box } from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';

const isImageIcon = (value: string | null | undefined) => {
  const next = (value ?? '').trim();
  return /^data:image\//i.test(next) || /^https?:\/\//i.test(next) || next.startsWith('/');
};

const resolveMuiIcon = (name: string) =>
  (MuiIcons as Record<string, SvgIconComponent>)[name] || null;

export function renderSuperCategoryMark(icon: string | null | undefined) {
  const next = (icon ?? '').trim();
  if (!next) return null;
  if (isImageIcon(next)) {
    return (
      <Box
        component="img"
        src={next}
        alt=""
        sx={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 0.75, flex: '0 0 auto' }}
      />
    );
  }
  const MuiIcon = resolveMuiIcon(next);
  if (MuiIcon) return <MuiIcon sx={{ fontSize: 18, flex: '0 0 auto' }} />;
  return next.length <= 2 ? (
    <Box component="span" sx={{ lineHeight: 1, flex: '0 0 auto' }}>
      {next}
    </Box>
  ) : null;
}
