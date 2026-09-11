import { Box, ButtonBase, Skeleton, Typography } from '@mui/material';
import { useLocation } from 'react-router';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import { renderSuperCategoryMark } from './superCategoryIcon';

/** The pages whose lists the super-category narrows. */
const FILTER_PATHS: ReadonlySet<string> = new Set([
  '/',
  '/explore',
  '/clubs',
  '/chats',
  '/follow',
  '/venues',
]);

const WRAP_SX = {
  width: '100%',
  maxWidth: APP_SHELL_MAX_WIDTH,
  mx: 'auto',
  px: 2,
  pb: 1.5,
  boxSizing: 'border-box',
} as const;

const TRACK_SX = {
  display: 'flex',
  gap: 0.5,
  p: 0.5,
  height: 44,
  boxSizing: 'border-box',
  borderRadius: 999,
  bgcolor: 'background.paper',
  border: '1px solid var(--duncit-card-border)',
} as const;

interface Props {
  loading: boolean;
  superCats: any[];
  value: string;
  onChange: (slug: string) => void;
}

/**
 * Super-category switch — "For You" / "For Your Pet" — as a segmented pill:
 * a surface track with one equal segment per super category, the selected one
 * filled green. Same value/onChange contract as before; names and icons stay
 * admin-managed. Native twin: components/SuperCategoryTabs.
 */
export default function SuperCategoryTabs({ loading, superCats, value, onChange }: Readonly<Props>) {
  const { pathname } = useLocation();

  if (!FILTER_PATHS.has(pathname)) return null;

  if (loading && superCats.length === 0) {
    return (
      <Box sx={WRAP_SX}>
        <Skeleton variant="rounded" height={44} sx={{ borderRadius: 999 }} />
      </Box>
    );
  }
  if (superCats.length === 0) return null;

  return (
    <Box sx={WRAP_SX}>
      <Box sx={TRACK_SX}>
        {superCats.map((c: any) => {
          const selected = c.slug === value;
          return (
            <ButtonBase
              key={c.id}
              aria-label={c.name}
              aria-pressed={selected}
              onClick={() => onChange(c.slug)}
              sx={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                minHeight: 0,
                gap: 0.75,
                px: 1.5,
                borderRadius: 999,
                color: selected ? 'primary.contrastText' : 'text.primary',
                bgcolor: selected ? 'primary.main' : 'transparent',
                transition: 'background-color 180ms ease, color 180ms ease',
              }}
            >
              {renderSuperCategoryMark(c.icon, 16)}
              <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                {c.name}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
