import { Link as RouterLink, useLocation } from 'react-router';
import { AppBar, Box, Container, Link, Stack, Toolbar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { LanguageSelect } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { paths } from '../../lib/paths';
import { AccountMenu } from './AccountMenu';
import { LiteLogo } from './LiteLogo';
import { NAV_ITEMS } from './nav';

/** The desktop text links. */
function NavLinks() {
  const { t } = useWebT();
  const { pathname } = useLocation();
  return (
    <Stack component="nav" aria-label={t('liteWeb.nav.label')} direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.to}
            component={RouterLink}
            to={item.to}
            underline="none"
            aria-current={active ? 'page' : undefined}
            sx={{
              px: 1.5,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 999,
              fontWeight: 700,
              color: active ? 'primary.main' : 'text.primary',
              bgcolor: active ? 'rgba(217, 45, 45, 0.08)' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            data-testid={`nav-${item.to.slice(1)}`}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </Stack>
  );
}

/** Sticky header: the logo, the four places, the language, "Create event" and the account. */
export function Header() {
  const { t, locale, locales, setLocale } = useWebT();
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Container maxWidth={false} sx={{ maxWidth: 1100 }}>
        <Toolbar disableGutters sx={{ gap: 1.5, minHeight: { xs: 60, md: 68 } }}>
          <LiteLogo />
          <Box sx={{ flexGrow: 1 }} />
          <NavLinks />
          <Box sx={{ display: { xs: 'none', md: 'block' }, width: 180 }}>
            <LanguageSelect value={locale} options={locales} onChange={setLocale} size="small" />
          </Box>
          <DuncitButton
            component={RouterLink}
            to={paths.create}
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            data-testid="header-create"
          >
            {t('liteWeb.nav.create')}
          </DuncitButton>
          <AccountMenu />
        </Toolbar>
      </Container>
    </AppBar>
  );
}
