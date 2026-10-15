import type { ReactNode } from 'react';
import { Alert, Skeleton, Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import { DuncitButton } from '@duncit/buttons';
import EmptyState from '../../components/EmptyState';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import FoodOrderRow from './FoodOrderRow';
import type { useMyFoodOrders } from './useMyFoodOrders';

interface Props {
  title: string;
  emptyTitle: string;
  emptyIcon: ReactNode;
  orders: ReturnType<typeof useMyFoodOrders>;
  testId: string;
}

/**
 * One section of "Your Food Orders" — its heading, then its loading, failed,
 * empty or listed state, and "Show more" while the server holds more.
 * Native twin: components/venue-food-orders/FoodOrdersSection.
 */
export default function FoodOrdersSection({ title, emptyTitle, emptyIcon, orders, testId }: Readonly<Props>) {
  const { t } = useTranslation();

  let body: ReactNode;
  if (orders.loading) {
    body = <Skeleton variant="rounded" height={120} role="progressbar" aria-label={t('mweb.a11y.loading')} data-testid={`${testId}-loading`} />;
  } else if (orders.failed) {
    body = (
      <EmptyState
        testId={`${testId}-failed`}
        icon={<ErrorOutlineIcon />}
        title={t('mweb.venueFood.myOrders.loadFailed')}
        actionLabel={t('mweb.ordersHistory.retry')}
        onAction={orders.reload}
      />
    );
  } else if (orders.rows.length === 0) {
    body = <EmptyState testId={`${testId}-empty`} icon={emptyIcon} title={emptyTitle} />;
  } else {
    body = (
      <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', m: 0, p: 0 }} data-testid={`${testId}-list`}>
        {orders.rows.map((order) => (
          <FoodOrderRow key={order.id} order={order} keys={orders.keys} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack component="section" spacing={1.5} aria-label={title} data-testid={testId}>
      <SectionHeader testId={`${testId}-header`} title={title} />
      {body}
      {orders.moreFailed && (
        <Alert severity="error" data-testid={`${testId}-more-failed`}>
          {t('mweb.venueFood.myOrders.loadFailed')}
        </Alert>
      )}
      {orders.hasMore && !orders.failed && (
        <DuncitButton
          variant="outlined"
          fullWidth
          loading={orders.loadingMore}
          onClick={orders.loadMore}
          data-testid={`${testId}-more`}
        >
          {t('mweb.venueFood.myOrders.loadMore')}
        </DuncitButton>
      )}
    </Stack>
  );
}
