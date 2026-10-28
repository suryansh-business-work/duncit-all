import { useId, useState, type ComponentType } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography, type SvgIconProps } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { DuncitIconButton } from '@duncit/buttons';
import { useWebT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { paths } from '../../lib/paths';
import { visibleNavItems } from './nav';

interface DrawerLinkProps {
  to: string;
  label: string;
  icon: ComponentType<SvgIconProps>;
  active: boolean;
  onPick: () => void;
  testId: string;
}

function DrawerLink({ to, label, icon: Icon, active, onPick, testId }: Readonly<DrawerLinkProps>) {
  return (
    <ListItemButton component={RouterLink} to={to} selected={active} aria-current={active ? 'page' : undefined} onClick={onPick} sx={{ mx: 1, borderRadius: 2 }} data-testid={testId}>
      <ListItemIcon sx={{ minWidth: 36, color: active ? 'text.primary' : 'text.secondary' }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={label} slotProps={{ primary: { sx: { fontWeight: active ? 700 : 500 } } }} />
    </ListItemButton>
  );
}

/**
 * Below a laptop the header's places fold into a menu button, which opens them
 * (and Create for a signed-in reader) in a drawer from the left. Picking one
 * closes it.
 */
export function NavDrawer() {
  const { t } = useWebT();
  const { pathname } = useLocation();
  const { signedIn } = useLiteSession();
  const { site_name: siteName } = useLiteSettings();
  const drawerId = useId();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <DuncitIconButton
        aria-label={t('liteWeb.nav.openMenu')}
        aria-expanded={open}
        aria-controls={open ? drawerId : undefined}
        onClick={() => setOpen(true)}
        sx={{ display: { md: 'none' } }}
        data-testid="header-menu"
      >
        <MenuIcon />
      </DuncitIconButton>
      <Drawer id={drawerId} anchor="left" open={open} onClose={close} slotProps={{ paper: { sx: { width: 280, maxWidth: '85vw' } } }} data-testid="nav-drawer">
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, pl: 2.5, pr: 1, py: 1 }}>
          <Typography component="p" variant="subtitle1" noWrap sx={{ fontWeight: 800 }}>
            {siteName}
          </Typography>
          <DuncitIconButton aria-label={t('lite.common.close')} onClick={close} data-testid="nav-drawer-close">
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
        <Divider />
        <List component="nav" aria-label={t('liteWeb.nav.label')}>
          {visibleNavItems(signedIn).map((item) => (
            <DrawerLink key={item.to} to={item.to} label={t(item.labelKey)} icon={item.icon} active={item.match(pathname)} onPick={close} testId={`nav-drawer-${item.to.slice(1)}`} />
          ))}
          {signedIn ? (
            <>
              <Divider sx={{ my: 1 }} />
              {/* Events already lights up on /create, so Create never claims the current page. */}
              <DrawerLink to={paths.create} label={t('liteWeb.nav.create')} icon={AddIcon} active={false} onPick={close} testId="nav-drawer-create" />
            </>
          ) : null}
        </List>
      </Drawer>
    </>
  );
}
