import { Avatar, Box, Stack, Typography } from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';

import { useStoreSession } from '../../app/providers/SessionProvider';
import { CircleButton } from '../../components/CircleButton';
import { DeliverToPill } from '../../components/DeliverToPill';
import { CartButton } from '../../components/header';
import { AnnouncementBar } from '../../components/header/AnnouncementBar';
import { MobileMenuButton } from '../../components/header/mobile-menu';
import { SearchForm } from '../../components/header/search-form';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

/**
 * The phone home's top: the menu, delivery pincode, cart and order updates,
 * then the brand-tinted block greeting the shopper's pet by name, with the
 * search pill.
 */
export function HomeHeader() {
  const { t } = useStoreT();
  const { me, signedIn } = useStoreSession();
  const pet = me?.pet_profile;
  const greeting = pet?.name ? t('ecommStore.home.forPet', { vars: { pet: pet.name } }) : t('ecommStore.home.greeting');
  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <AnnouncementBar />
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <MobileMenuButton />
          <DeliverToPill />
        </Stack>
        <Stack direction="row" spacing={1}>
          <CartButton />
          {signedIn ? (
            <CircleButton to={paths.orders} aria-label={t('ecommStore.home.updates')}>
              <NotificationsNoneRoundedIcon />
            </CircleButton>
          ) : null}
        </Stack>
      </Stack>
      <Stack spacing={2} sx={{ bgcolor: T.brandTint, borderRadius: `${T.radius.card}px`, p: 2.5 }}>
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
