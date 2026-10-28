import { useId, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { LITE_RADII } from '../../../shared/tokens';
import { useSignInPrompt } from '../../app/providers/SignInPromptProvider';
import { UserAvatar } from '../../components/UserAvatar';
import { paths } from '../../lib/paths';

/** Signed out: a Sign in button. Signed in: the avatar, opening Profile / Settings / Sign out. */
export function AccountMenu() {
  const { t } = useWebT();
  const { signedIn, me, signOut } = useLiteSession();
  const { openSignIn } = useSignInPrompt();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  if (!signedIn) {
    return (
      <DuncitButton variant="contained" size="small" onClick={openSignIn} sx={{ borderRadius: LITE_RADII.pill }} data-testid="header-sign-in">
        {t('lite.common.signIn')}
      </DuncitButton>
    );
  }
  const name = me?.name ?? '';
  return (
    <>
      <DuncitIconButton
        aria-label={t('liteWeb.nav.menu')}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? menuId : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ p: 0.5 }}
        data-testid="header-account"
      >
        <UserAvatar name={name} url={me?.avatar_url} size={32} />
      </DuncitIconButton>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={close} data-testid="account-menu">
        {me ? (
          <MenuItem component={RouterLink} to={paths.user(me.handle)} onClick={close} data-testid="account-menu-profile">
            <ListItemIcon>
              <PersonOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={name} secondary={me.email || me.phone || `@${me.handle}`} />
          </MenuItem>
        ) : null}
        <MenuItem component={RouterLink} to={paths.settings()} onClick={close} data-testid="account-menu-settings">
          <ListItemIcon>
            <SettingsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('liteWeb.nav.settings')} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            signOut().catch((error: unknown) => notifyError(parseApiError(error)));
          }}
          data-testid="account-menu-sign-out"
        >
          <ListItemIcon>
            <LogoutOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('lite.common.signOut')} />
        </MenuItem>
      </Menu>
    </>
  );
}
