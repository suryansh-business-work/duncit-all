import { Link as RouterLink, useNavigate } from 'react-router';
import { AppBar, Badge, Box, Container, Link, Stack, Toolbar } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';

import { useCart } from '../../app/providers/CartProvider';
import { useWishlist } from '../../app/providers/WishlistProvider';
import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { CircleButton } from '../CircleButton';
import { DeliverToPill } from '../DeliverToPill';
import { StoreLogo } from '../StoreLogo';
import { AccountMenu } from './AccountMenu';
import { AnnouncementBar } from './AnnouncementBar';
import { MegaMenu } from './mega-menu';
import { MobileMenuButton } from './mobile-menu';
import { SearchForm } from './search-form';

/** The round cart button with its count; opens the cart drawer. */
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

function HomeLink() {
  const { t } = useStoreT();
  const { store_name: storeName } = useStoreSettings();
  return (
    <Link component={RouterLink} to={paths.home} aria-label={t('ecommStore.header.home', { vars: { name: storeName } })}>
      <StoreLogo />
    </Link>
  );
}

/** Desktop: logo, delivery pill, wide search, the pet menu, account / wishlist / cart. */
export function Header() {
  const { t } = useStoreT();
  const { count: savedCount } = useWishlist();
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ display: { xs: 'none', md: 'block' }, borderBottom: 1, borderColor: 'divider' }}>
      <AnnouncementBar />
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 2, minHeight: 76 }}>
          <HomeLink />
          <DeliverToPill />
          <Box sx={{ flexGrow: 1, maxWidth: 620 }}>
            <SearchForm id="header-search" />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1}>
            <AccountMenu />
            <CircleButton to={paths.wishlist} aria-label={t('ecommStore.header.wishlist', { count: savedCount })}>
              <Badge badgeContent={savedCount} color="primary">
                <FavoriteBorderIcon />
              </Badge>
            </CircleButton>
            <CartButton />
          </Stack>
        </Toolbar>
        <Box sx={{ pb: 1 }}>
          <MegaMenu />
        </Box>
      </Container>
    </AppBar>
  );
}

/** Phone pages other than home: back, the logo, the menu and the cart. */
export function MobileTopBar() {
  const { t } = useStoreT();
  const navigate = useNavigate();
  return (
    <Box component="header" sx={{ display: { xs: 'block', md: 'none' }, position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.default' }}>
      <AnnouncementBar />
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
        <CircleButton aria-label={t('ecommStore.header.back')} onClick={() => navigate(-1)}>
          <ArrowBackRoundedIcon />
        </CircleButton>
        <HomeLink />
        <Stack direction="row" spacing={1}>
          <MobileMenuButton />
          <CartButton />
        </Stack>
      </Stack>
    </Box>
  );
}
