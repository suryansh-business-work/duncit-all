import { AppBar, Box, MenuItem, TextField, Toolbar, Tooltip, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { DuncitIconButton } from '@duncit/buttons';
import { useColorMode } from '@duncit/theme';
import { usePortalT } from '../../shared/i18n';
import { UserMenu } from './UserMenu';

interface Props {
  onOpenNav: () => void;
}

/** The console's header, sticky at the top of the content panel: menu button on phones, title, language, color mode, account. */
export function ConsoleAppBar({ onOpenNav }: Readonly<Props>) {
  const { t, locale, locales, setLocale } = usePortalT();
  const { mode, toggle } = useColorMode();
  const modeLabel = mode === 'light' ? t('litePortal.app.toDark') : t('litePortal.app.toLight');

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={(theme) => ({
        top: 0,
        borderBottom: 1,
        borderColor: 'divider',
        backdropFilter: 'saturate(140%) blur(12px)',
        backgroundColor: `rgba(${theme.vars?.palette.background.paperChannel} / 0.85)`,
      })}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, md: 60 } }}>
        <DuncitIconButton
          edge="start"
          onClick={onOpenNav}
          aria-label={t('litePortal.app.openNav')}
          data-testid="app-bar-open-nav"
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </DuncitIconButton>
        <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1, minWidth: 0, fontWeight: 800, fontSize: { xs: '1rem', md: '1.1rem' } }}>
          {t('litePortal.app.title')}
        </Typography>
        {locales.length > 1 && (
          <TextField
            select
            size="small"
            label={t('litePortal.app.language')}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            sx={{ minWidth: { xs: 112, sm: 140 } }}
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
