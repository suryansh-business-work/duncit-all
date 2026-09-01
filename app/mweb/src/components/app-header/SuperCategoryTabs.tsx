import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { useLocation } from 'react-router';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import { renderSuperCategoryMark } from './superCategoryIcon';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  loading: boolean;
  superCats: any[];
  value: string;
  onChange: (slug: string) => void;
}

/**
 * Super-category switch as the mock's promo tiles — "For You" / "For Your Pet":
 * the active super-category is a pink gradient card, the others are light
 * cards. Same value/onChange contract as the old segmented control; names and
 * icons stay admin-managed.
 */
export default function SuperCategoryTabs({ loading, superCats, value, onChange }: Readonly<Props>) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const canFilter = ['/', '/explore', '/clubs', '/chats', '/follow'].includes(pathname);

  if (!canFilter) return null;

  if (loading && superCats.length === 0) {
    return (
      <Box sx={{ width: '100%', maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto', px: 1.5, pb: 0.75 }}>
        <Skeleton variant="rounded" height={64} sx={{ borderRadius: '16px' }} />
      </Box>
    );
  }
  if (superCats.length === 0) return null;

  // Admin-managed: the super category's description (Categories > edit super
  // category). The bundled copy is only the fallback while it is unset.
  const subtitleOf = (c: any): string => {
    if (c.description?.trim()) return c.description.trim();
    const slug = String(c.slug ?? '').toLowerCase();
    if (slug.includes('pet')) return t('mweb.home.forPetSubtitle');
    return t('mweb.home.forYouSubtitle');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto', px: 1.25, pb: 1 }}>
      <Stack direction="row" spacing={1}>
        {superCats.map((c: any) => {
          const selected = c.slug === value;
          return (
            <Box
              key={c.id}
              component="button"
              type="button"
              aria-label={c.name}
              aria-pressed={selected}
              onClick={() => onChange(c.slug)}
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 1.1,
                borderRadius: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                border: '1px solid',
                borderColor: selected ? 'transparent' : 'divider',
                color: selected ? 'common.white' : 'text.primary',
                background: (theme) =>
                  selected
                    ? 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 58%, #f5337a 100%)'
                    : theme.palette.background.paper,
                boxShadow: selected ? '0 12px 26px rgba(245,51,122,0.28)' : 'none',
                transition: 'box-shadow 200ms ease, transform 200ms ease',
                '&:hover': { transform: 'translateY(-1px)' },
              }}
            >
              <Box sx={{ flex: '0 0 auto', display: 'grid', placeItems: 'center' }}>
                {renderSuperCategoryMark(c.icon)}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, lineHeight: 1.15 }}
                  noWrap
                >
                  {c.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.2,
                    opacity: selected ? 0.92 : 1,
                    color: selected ? 'inherit' : 'text.secondary',
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {subtitleOf(c)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
