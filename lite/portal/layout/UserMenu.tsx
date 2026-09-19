import { useState } from 'react';
import { Avatar, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitIconButton } from '@duncit/buttons';
import { SITE_URL } from '../../shared/env';
import { usePortalT } from '../../shared/i18n';
import { useLiteSession } from '../../shared/session';

const initialOf = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

/** The avatar button at the end of the app bar: who is signed in, the site link, sign out. */
export function UserMenu() {
  const { t } = usePortalT();
  const { me, signOut } = useLiteSession();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const close = () => setAnchor(null);

  return (
    <>
      <DuncitIconButton
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={t('litePortal.app.accountMenu')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'console-user-menu' : undefined}
        data-testid="user-menu-open"
        sx={{ ml: 0.5 }}
      >
        <Avatar src={me?.avatar_url ?? undefined} alt="" sx={{ width: 32, height: 32, fontSize: 14 }}>
          {initialOf(me?.name ?? '')}
        </Avatar>
      </DuncitIconButton>
      <Menu id="console-user-menu" anchorEl={anchor} open={open} onClose={close}>
        <MenuItem disabled sx={{ opacity: '1 !important' }}>
          <ListItemText
            primary={me?.name}
            secondary={<Typography variant="caption">{t('litePortal.app.signedInAs', { vars: { email: me?.email ?? '' } })}</Typography>}
          />
        </MenuItem>
        <Divider />
        <MenuItem component="a" href={SITE_URL} target="_blank" rel="noopener noreferrer" onClick={close} data-testid="user-menu-site">
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('litePortal.app.openSite')} secondary={t('litePortal.common.opensNewTab')} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            signOut().catch(() => undefined);
          }}
          data-testid="user-menu-sign-out"
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('lite.common.signOut')} />
        </MenuItem>
      </Menu>
    </>
  );
}
