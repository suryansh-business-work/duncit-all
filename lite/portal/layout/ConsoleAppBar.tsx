import { AppBar, Box, MenuItem, TextField, Toolbar, Tooltip, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { DuncitIconButton } from '@duncit/buttons';
import { useColorMode } from '@duncit/theme';
import { usePortalT } from '../../shared/i18n';
import { DRAWER_WIDTH } from './nav-items';
import { UserMenu } from './UserMenu';

interface Props {
  onOpenNav: () => void;
}

/** The console's top bar: menu button on phones, title, language, color mode, account. */
export function ConsoleAppBar({ onOpenNav }: Readonly<Props>) {
  const { t, locale, locales, setLocale } = usePortalT();
  const { mode, toggle } = useColorMode();
  const modeLabel = mode === 'light' ? t('litePortal.app.toDark') : t('litePortal.app.toLight');

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` } }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <DuncitIconButton
          edge="start"
          onClick={onOpenNav}
          aria-label={t('litePortal.app.openNav')}
          data-testid="app-bar-open-nav"
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </DuncitIconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 800 }}>
          {t('litePortal.app.title')}
        </Typography>
        {locales.length > 1 && (
          <TextField
            select
            size="small"
            label={t('litePortal.app.language')}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            sx={{ minWidth: 140 }}
            data-testid="app-bar-language"
          >
            {locales.map((option) => (
              <MenuItem key={option.code} value={option.code}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Tooltip title={modeLabel}>
          <DuncitIconButton onClick={toggle} aria-label={modeLabel} data-testid="app-bar-color-mode">
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </DuncitIconButton>
        </Tooltip>
        <Box>
          <UserMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
