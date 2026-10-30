import { Box, ButtonBase, Link, Typography } from '@mui/material';
import type { ProfileMenuKey } from '@duncit/utils';
import { RADIUS, SURFACE_SX } from '../../../theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { profileIcon } from './profileIcons';
import type { MenuEntry } from './profileSections';

/** Which tiles the Profile tour walks through. Keyed off the tile, so a
 * reordered or edited grid cannot point a step at the wrong destination.
 * Native twin: Sidebar/SidebarQuickGrid. */
const TOUR_ANCHORS: Readonly<Record<string, string>> = {
  'pod-history': 'profile-history',
  earn: 'profile-earn',
};

interface TileProps {
  tile: MenuEntry;
  /** A red count on the corner (the Chats unread count); none at 0 or unset. */
  badgeCount?: number;
  onNavigate: (to: string) => void;
}

/** One square Quick Access tile: an accent icon over its label. */
export function QuickTile({ tile, badgeCount, onNavigate }: Readonly<TileProps>) {
  const { t } = useTranslation();
  const unread = badgeCount && badgeCount > 0 ? badgeCount : 0;
  return (
    <ButtonBase
      data-testid={`sidebar-grid-${tile.key}`}
      data-tour={TOUR_ANCHORS[tile.key]}
      onClick={() => onNavigate(tile.to)}
      aria-label={tile.label}
      aria-describedby={unread ? `sidebar-grid-${tile.key}-badge` : undefined}
      sx={{
        ...SURFACE_SX,
        borderRadius: `${RADIUS.base}px`,
        position: 'relative',
        aspectRatio: '1 / 1',
        minWidth: 0,
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        transition: 'border-color 160ms ease',
        '&:hover': { borderColor: 'divider' },
        '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Box component="span" aria-hidden sx={{ display: 'flex', color: 'secondary.main', '& svg': { fontSize: 26 } }}>
        {profileIcon(tile.icon)}
      </Box>
      <Typography component="span" sx={{ fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.25 }}>
        {tile.label}
      </Typography>
      {unread ? (
        <Box
          component="span"
          data-testid="sidebar-grid-badge"
          aria-hidden
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 20,
            height: 20,
            px: 0.625,
            borderRadius: `${RADIUS.pill}px`,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'error.main',
            color: 'error.contrastText',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {unread > 9 ? '9+' : unread}
        </Box>
      ) : null}
      {/* The count in words, for the tile's accessible description. */}
      {unread ? (
        <Box component="span" id={`sidebar-grid-${tile.key}-badge`} hidden>
          {t('mweb.sidebar.unreadBadge', { vars: { unread } })}
        </Box>
      ) : null}
    </ButtonBase>
  );
}

interface Props {
  tiles: readonly MenuEntry[];
  badgeCounts?: Readonly<Partial<Record<ProfileMenuKey, number>>>;
  onEdit: () => void;
  onNavigate: (to: string) => void;
}

/** "Quick Access" — the header row with its Edit link, then a 3-column grid of
 * the member's six tiles. */
export default function QuickActionGrid({ tiles, badgeCounts, onEdit, onNavigate }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box component="section" aria-labelledby="sidebar-quick-title" sx={{ px: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Typography id="sidebar-quick-title" component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>
          {t('mweb.sidebar.quickAccess')}
        </Typography>
        <Link
          component="button"
          type="button"
          data-testid="sidebar-quick-edit"
          onClick={onEdit}
          aria-label={t('mweb.sidebar.editQuickAccess')}
          underline="hover"
          sx={{ fontSize: 14, fontWeight: 600, color: 'secondary.main' }}
        >
          {t('mweb.sidebar.edit')}
        </Link>
      </Box>
      {/* Square tiles, three to a row on a phone; on a wider sidebar (desktop)
          all six share one row, or three columns would blow each tile up. */}
      <Box
        data-testid="sidebar-quick-grid"
        sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 1.25 }}
      >
        {tiles.map((tile) => (
          <QuickTile key={tile.key} tile={tile} badgeCount={badgeCounts?.[tile.key]} onNavigate={onNavigate} />
        ))}
      </Box>
    </Box>
  );
}
