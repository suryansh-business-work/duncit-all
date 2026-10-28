import { NavLink } from 'react-router';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import { resolveIconSource } from '@duncit/fallback-icons';
import { LITE_FALLBACK_ICONS } from '../../shared/fallback-icons';
import { usePortalT } from '../../shared/i18n';
import { LITE_RADII } from '../../shared/tokens';
import { NAV_ITEMS } from './nav-items';

interface Props {
  /** Closes the temporary drawer after a pick on a phone. */
  onNavigate?: () => void;
}

/** A Duncit portal's sidebar entry: a quiet row, the current page washed and its icon in the accent. */
const ITEM_SX = {
  borderRadius: `${LITE_RADII.control}px`,
  minHeight: 40,
  mb: 0.25,
  px: 1.25,
  color: 'text.secondary',
  '& .MuiListItemIcon-root': { minWidth: 34, color: 'inherit' },
  '&:hover': { color: 'text.primary' },
  '&.active': { bgcolor: 'action.selected', color: 'text.primary', '& .MuiListItemIcon-root': { color: 'primary.main' } },
  '&.active .MuiListItemText-primary': { fontWeight: 700 },
} as const;

/** The sidebar: the brand, then every console page. Shared by the permanent and the temporary drawer. */
export function ConsoleNav({ onNavigate }: Readonly<Props>) {
  const { t } = usePortalT();
  const { source } = resolveIconSource(null, LITE_FALLBACK_ICONS.logo);
  return (
    <Stack sx={{ height: '100%' }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', px: 2, minHeight: { xs: 56, md: 60 } }}>
        <Box component="img" src={source} alt="" width={32} height={32} sx={{ display: 'block', borderRadius: `${LITE_RADII.control}px` }} />
        <Typography variant="subtitle1" component="span" noWrap sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
          {t('litePortal.app.title')}
        </Typography>
      </Stack>
      <List component="nav" aria-label={t('litePortal.app.navLabel')} sx={{ px: 1.25, pt: 0.5, flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <ListItemButton key={item.path} component={NavLink} to={item.path} end={item.path === '/'} onClick={onNavigate} data-testid={item.testId} sx={ITEM_SX}>
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t(item.labelKey)} slotProps={{ primary: { variant: 'body2' } }} />
            </ListItemButton>
          );
        })}
      </List>
    </Stack>
  );
}
