import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, List, ListItemButton, ListItemText, Stack } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PetsRoundedIcon from '@mui/icons-material/PetsRounded';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';

import { useStoreSession } from '../../app/providers/SessionProvider';
import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { useWishlist } from '../../app/providers/WishlistProvider';
import { MY_ORDERS } from '../../graphql/orders';
import { logFailure } from '../../lib/log';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T, tintAt } from '../../theme/tokens';

interface Row {
  key: string;
  to?: string;
  onClick?: () => void;
  icon: ReactNode;
  title: string;
  detail?: string;
}

function IconTile({ icon, position }: Readonly<{ icon: ReactNode; position: number }>) {
  return (
    <Box sx={{ width: 44, height: 44, borderRadius: '14px', bgcolor: tintAt(position), display: 'grid', placeItems: 'center', color: T.ink, flexShrink: 0 }} aria-hidden>
      {icon}
    </Box>
  );
}

/** The profile's list rows: rounded icon tiles, a title and a detail line each. */
export function AccountMenuList() {
  const { t } = useStoreT();
  const { pathname } = useLocation();
  const { me, signOut } = useStoreSession();
  const { autoship_enabled: autoship } = useStoreSettings();
  const { count: saved } = useWishlist();
  const { data } = useQuery(MY_ORDERS);
  const orders = data?.storeMyOrders.length ?? 0;
  const rows: Row[] = [
    { key: 'pet', to: paths.petProfile, icon: <PetsRoundedIcon />, title: t('ecommStore.account.petProfile'), detail: me?.pet_profile?.name ?? t('ecommStore.account.petAdd') },
    { key: 'orders', to: paths.orders, icon: <Inventory2OutlinedIcon />, title: t('ecommStore.account.orders'), detail: t('ecommStore.account.ordersCount', { count: orders }) },
    ...(autoship ? [{ key: 'autoship', to: paths.autoship, icon: <SyncRoundedIcon />, title: t('ecommStore.nav.autoship'), detail: t('ecommStore.account.autoshipDetail') }] : []),
    { key: 'wishlist', to: paths.wishlist, icon: <FavoriteBorderRoundedIcon />, title: t('ecommStore.account.wishlist'), detail: t('ecommStore.account.itemsCount', { count: saved }) },
    { key: 'addresses', to: paths.addresses, icon: <HomeWorkOutlinedIcon />, title: t('ecommStore.account.addresses'), detail: t('ecommStore.account.addressesDetail') },
    { key: 'returns', to: paths.returns, icon: <AssignmentReturnOutlinedIcon />, title: t('ecommStore.account.returns'), detail: t('ecommStore.account.returnsDetail') },
    { key: 'signout', onClick: () => signOut().catch(logFailure('account', 'signOut')), icon: <LogoutRoundedIcon />, title: t('ecommStore.auth.signOut') },
  ];
  return (
    <List component="nav" aria-label={t('ecommStore.account.menu')} sx={{ display: 'grid', gap: 1 }}>
      {rows.map((row, position) => {
        const body = (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
            <IconTile icon={row.icon} position={position} />
            <ListItemText primary={row.title} secondary={row.detail} slotProps={{ primary: { sx: { fontWeight: 800 } } }} />
            <ChevronRightRoundedIcon color="action" aria-hidden />
          </Stack>
        );
        const sx = { bgcolor: T.surface, borderRadius: `${T.radius.panel}px`, py: 1 };
        return row.to ? (
          <ListItemButton key={row.key} component={RouterLink} to={row.to} selected={pathname === row.to} aria-current={pathname === row.to ? 'page' : undefined} sx={sx}>
            {body}
          </ListItemButton>
        ) : (
          <ListItemButton key={row.key} onClick={row.onClick} sx={sx}>
            {body}
          </ListItemButton>
        );
      })}
    </List>
  );
}
