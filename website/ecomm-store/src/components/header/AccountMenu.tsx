import { useId, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Divider, Menu, MenuItem } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineRounded';
import { CircleButton } from '../CircleButton';

import { useStoreSession } from '../../app/providers/SessionProvider';
import { logFailure } from '../../lib/log';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';

export const ACCOUNT_LINKS = [
  { to: paths.account, labelKey: 'ecommStore.account.overview' },
  { to: paths.orders, labelKey: 'ecommStore.account.orders' },
  { to: paths.addresses, labelKey: 'ecommStore.account.addresses' },
  { to: paths.returns, labelKey: 'ecommStore.account.returns' },
] as const;

/** Signed out: one button that opens sign-in. Signed in: the account menu. */
export function AccountMenu() {
  const { t } = useStoreT();
  const { signedIn, openSignIn, signOut } = useStoreSession();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  if (!signedIn) {
    return (
      <CircleButton aria-label={t('ecommStore.auth.signIn')} onClick={openSignIn}>
        <PersonOutlineIcon />
      </CircleButton>
    );
  }
  return (
    <>
      <CircleButton
        aria-label={t('ecommStore.account.menu')}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? menuId : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <PersonOutlineIcon />
      </CircleButton>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {ACCOUNT_LINKS.map((link) => (
          <MenuItem key={link.to} component={RouterLink} to={link.to} onClick={close}>
            {t(link.labelKey)}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            signOut().catch(logFailure('header', 'signOut'));
          }}
        >
          {t('ecommStore.auth.signOut')}
        </MenuItem>
      </Menu>
    </>
  );
}
