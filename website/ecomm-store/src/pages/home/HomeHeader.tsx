import { Avatar, Box, Stack, Typography } from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';

import { useStoreSession } from '../../app/providers/SessionProvider';
import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { CircleButton } from '../../components/CircleButton';
import { DeliverToPill } from '../../components/DeliverToPill';
import { CartButton, HomeLink } from '../../components/header';
import { AnnouncementBar } from '../../components/header/AnnouncementBar';
import { MobileMenuButton } from '../../components/header/mobile-menu';
import { SearchForm } from '../../components/header/search-form';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

/**
 * The phone home's top: the menu and logo, cart and order updates, the
 * delivery pincode, then the soft hero block greeting the shopper's pet by
 * name, with the search field.
 */
export function HomeHeader() {
  const { t } = useStoreT();
  const { me, signedIn } = useStoreSession();
  const { home_greeting: operatorGreeting } = useStoreSettings();
  const pet = me?.pet_profile;
  // A shopper with a named pet is greeted by that name; the operator's line
  // (Settings) replaces only the built-in greeting everyone else sees.
  const fallback = operatorGreeting.trim() || t('ecommStore.home.greeting');
  const greeting = pet?.name ? t('ecommStore.home.forPet', { vars: { pet: pet.name } }) : fallback;
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <AnnouncementBar />
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <MobileMenuButton />
          <HomeLink height={36} />
        </Stack>
        <Stack direction="row" spacing={1}>
          {signedIn ? (
            <CircleButton to={paths.orders} aria-label={t('ecommStore.home.updates')}>
              <NotificationsNoneRoundedIcon />
            </CircleButton>
          ) : null}
          <CartButton />
        </Stack>
      </Stack>
      <Stack spacing={2} sx={{ background: T.heroGradient, borderRadius: `${T.radius.card}px`, boxShadow: T.shadow, p: 2.5 }}>
        <Box sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
          <DeliverToPill />
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {pet?.photo_url ? <Avatar src={pet.photo_url} alt="" sx={{ width: 48, height: 48 }} /> : null}
          <Typography variant="h1" component="h1">
            {greeting}
          </Typography>
        </Stack>
        <SearchForm id="home-search" />
      </Stack>
    </Box>
  );
}
