import { Link as RouterLink, useNavigate } from 'react-router';
import { AppBar, Badge, Box, Container, Link, Stack, Toolbar } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';

import { useCart } from '../../app/providers/CartProvider';
import { useWishlist } from '../../app/providers/WishlistProvider';
import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { CircleButton } from '../CircleButton';
import { DeliverToPill } from '../DeliverToPill';
import { usePreferencesDrawer } from '../preferences';
import { StoreLogo } from '../StoreLogo';
import { AccountMenu } from './AccountMenu';
import { AnnouncementBar } from './AnnouncementBar';
import { HeaderAction } from './HeaderAction';
import { MobileMenuButton } from './mobile-menu';
import { NavRow } from './NavRow';
import { SearchForm } from './search-form';

/** The round cart button with its count; opens the cart drawer (phone headers). */
export function CartButton() {
  const { t } = useStoreT();
  const { cart, setDrawerOpen } = useCart();
  const itemCount = cart?.item_count ?? 0;
  return (
    <CircleButton aria-label={t('ecommStore.header.cart', { count: itemCount })} aria-haspopup="dialog" onClick={() => setDrawerOpen(true)}>
      <Badge badgeContent={itemCount} color="primary">
        <ShoppingBagOutlinedIcon />
      </Badge>
    </CircleButton>
  );
}

export function HomeLink({ height }: Readonly<{ height?: number }>) {
  const { t } = useStoreT();
  const { store_name: storeName } = useStoreSettings();
  return (
    <Link component={RouterLink} to={paths.home} aria-label={t('ecommStore.header.home', { vars: { name: storeName } })} sx={{ flexShrink: 0, display: 'block' }}>
      <StoreLogo height={height} />
    </Link>
  );
}

/** Preferences, account, wishlist and cart: each an icon over its caption. */
function HeaderActions() {
  const { t } = useStoreT();
  const { count: savedCount } = useWishlist();
  const { cart, setDrawerOpen } = useCart();
  const { openPreferences } = usePreferencesDrawer();
  const itemCount = cart?.item_count ?? 0;
  const prefsLabel = t('ecommStore.prefs.button');
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
      <HeaderAction icon={<TuneRoundedIcon />} caption={prefsLabel} aria-label={prefsLabel} aria-haspopup="dialog" onClick={openPreferences} testId="header-preferences" />
      <AccountMenu />
      <HeaderAction
        icon={<FavoriteBorderIcon />}
        caption={t('ecommStore.header.wishlistCaption')}
        aria-label={t('ecommStore.header.wishlist', { count: savedCount })}
        to={paths.wishlist}
        badge={savedCount}
        testId="header-wishlist"
      />
      <HeaderAction
        icon={<ShoppingBagOutlinedIcon />}
        caption={t('ecommStore.header.cartCaption')}
        aria-label={t('ecommStore.header.cart', { count: itemCount })}
        aria-haspopup="dialog"
        onClick={() => setDrawerOpen(true)}
        badge={itemCount}
        testId="header-cart"
      />
    </Stack>
  );
}

/** Desktop: logo, delivery pill, the wide search, labelled actions; then the nav row. */
export function Header() {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ display: { xs: 'none', md: 'block' }, bgcolor: T.surface, borderBottom: 1, borderColor: T.border, boxShadow: T.shadow }}
    >
      <AnnouncementBar />
      <Container maxWidth={false} sx={{ maxWidth: T.contentMax }}>
        <Toolbar disableGutters sx={{ gap: 3, minHeight: 84 }}>
          <HomeLink height={44} />
          <DeliverToPill />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <SearchForm id="header-search" />
          </Box>
          <HeaderActions />
        </Toolbar>
      </Container>
      <Box sx={{ borderTop: 1, borderColor: T.border }}>
        <Container maxWidth={false} sx={{ maxWidth: T.contentMax }}>
          <NavRow />
        </Container>
      </Box>
    </AppBar>
  );
}

/** Phone pages other than home: back, the logo, the menu and the cart, then search. */
export function MobileTopBar() {
  const { t } = useStoreT();
  const navigate = useNavigate();
  return (
    <Box
      component="header"
      sx={{ display: { xs: 'block', md: 'none' }, position: 'sticky', top: 0, zIndex: 2, bgcolor: T.surface, borderBottom: 1, borderColor: T.border }}
    >
      <AnnouncementBar />
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, pt: 1 }}>
        <CircleButton aria-label={t('ecommStore.header.back')} onClick={() => navigate(-1)}>
          <ArrowBackRoundedIcon />
        </CircleButton>
        <HomeLink height={36} />
        <Stack direction="row" spacing={1}>
          <MobileMenuButton />
          <CartButton />
        </Stack>
      </Stack>
      <Box sx={{ px: 2, py: 1 }}>
        <SearchForm id="mobile-top-search" />
      </Box>
    </Box>
  );
}
