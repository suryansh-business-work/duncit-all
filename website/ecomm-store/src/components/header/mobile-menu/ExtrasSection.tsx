import { List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';

import { EARNWITH_URL } from '../../../config/env';
import { useStoreT } from '../../../i18n';
import { NewTabHint } from '../../footer/NewTabHint';
import { usePreferencesDrawer } from '../../preferences';

const ROW_SX = { minHeight: 44 } as const;

/** Display & accessibility (the preferences sidebar), and Earn with Duncit in a new tab. */
export function ExtrasSection({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
  const { t } = useStoreT();
  const { openPreferences } = usePreferencesDrawer();
  return (
    <List disablePadding>
      <ListItem disablePadding>
        <ListItemButton
          sx={ROW_SX}
          aria-haspopup="dialog"
          onClick={() => {
            onNavigate();
            openPreferences();
          }}
          data-testid="mobile-menu-preferences"
        >
          <ListItemIcon>
            <TuneRoundedIcon />
          </ListItemIcon>
          <ListItemText primary={t('ecommStore.prefs.title')} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component="a" href={EARNWITH_URL} target="_blank" rel="noopener noreferrer" sx={ROW_SX} data-testid="mobile-menu-earn">
          <ListItemIcon>
            <PaidOutlinedIcon />
          </ListItemIcon>
          <ListItemText
            primary={
              <>
                {t('ecommStore.menu.earnWith')}
                <NewTabHint />
              </>
            }
          />
        </ListItemButton>
      </ListItem>
    </List>
  );
}
