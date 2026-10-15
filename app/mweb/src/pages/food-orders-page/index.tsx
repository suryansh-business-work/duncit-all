import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router';
import { Alert, Link, Stack } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import RestaurantIcon from '@mui/icons-material/RestaurantRounded';
import { MY_FOOD_ORDERS_PAGE_SIZE } from '@duncit/utils';
import { useEntityPageMeta } from '../../app/pageMeta';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import FoodOrdersSection from './FoodOrdersSection';
import { useMyFoodOrders } from './useMyFoodOrders';

/** Storage can be blocked (private mode): a visitor it cannot read is treated as signed out. */
function hasSession(): boolean {
  try {
    return !!localStorage.getItem('token');
  } catch {
    return false;
  }
}

/**
 * Your Food Orders (/food-orders) — the orders still with a kitchen, then the
 * ones served or cancelled, a page at a time. Public like the menu: a guest
 * sees the orders this browser placed; a member also sees every order their
 * account placed, on any device.
 * Native twin: screens/MyFoodOrdersScreen.
 */
export default function FoodOrdersPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const signedIn = useMemo(() => hasSession(), []);
  const current = useMyFoodOrders('CURRENT', MY_FOOD_ORDERS_PAGE_SIZE.current);
  const past = useMyFoodOrders('PAST', MY_FOOD_ORDERS_PAGE_SIZE.past);
  useEntityPageMeta(t('mweb.venueFood.myOrders.title'));

  return (
    <Stack spacing={2.5} sx={{ py: 0.5, pb: 4 }} data-testid="food-orders-screen">
      <PageHeader testId="food-orders-header" title={t('mweb.venueFood.myOrders.title')} />
      {!signedIn && (
        <Alert severity="info" data-testid="food-orders-sign-in">
          <Link component={RouterLink} to={`/login?redirect=${encodeURIComponent(location.pathname)}`} color="inherit">
            {t('mweb.venueFood.myOrders.signInHint')}
          </Link>
        </Alert>
      )}
      <FoodOrdersSection
        testId="food-orders-current"
        title={t('mweb.venueFood.myOrders.current')}
        emptyTitle={t('mweb.venueFood.myOrders.currentEmpty')}
        emptyIcon={<RestaurantIcon />}
        orders={current}
      />
      <FoodOrdersSection
        testId="food-orders-past"
        title={t('mweb.venueFood.myOrders.past')}
        emptyTitle={t('mweb.venueFood.myOrders.pastEmpty')}
        emptyIcon={<ReceiptLongIcon />}
        orders={past}
      />
    </Stack>
  );
}
