import { NavLink } from 'react-router';
import { List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material';
import { usePortalT } from '../../shared/i18n';
import { NAV_ITEMS } from './nav-items';

interface Props {
  /** Closes the temporary drawer after a pick on a phone. */
  onNavigate?: () => void;
}

/** The sidebar list, shared by the permanent and the temporary drawer. */
export function ConsoleNav({ onNavigate }: Readonly<Props>) {
  const { t } = usePortalT();
  return (
    <>
      <Toolbar>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {t('litePortal.app.title')}
        </Typography>
      </Toolbar>
      <List component="nav" aria-label={t('litePortal.app.navLabel')} sx={{ px: 1 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              data-testid={item.testId}
              sx={{ borderRadius: 1, mb: 0.5, '&.active': { bgcolor: 'action.selected', fontWeight: 700 } }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t(item.labelKey)} />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );
}
