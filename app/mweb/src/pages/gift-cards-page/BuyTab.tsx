import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import HowItWorksCard from './HowItWorksCard';
import BuyForm from './BuyForm';
import { GIFT_CARD_STOREFRONT, type GiftCardStorefront } from './queries';

/**
 * The buy flow: ONE gift card — the design the Loyalty team made the default —
 * an amount, how many, email or a printed card by courier, and who it is for.
 * Amounts, limits, the delivery fee and printed stock all come from the live
 * policy (Loyalty > Gift Card Settings), the same one the server enforces.
 */
export default function BuyTab() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ giftCardStorefront: GiftCardStorefront }>(GIFT_CARD_STOREFRONT, {
    fetchPolicy: 'cache-and-network',
  });
  const store = data?.giftCardStorefront ?? null;

  return (
    <Stack data-testid="gift-cards-buy-tab" spacing={2}>
      {error && !store && (
        <Alert data-testid="gift-cards-buy-error" severity="error">
          {t('mweb.giftCards.loadError')}
        </Alert>
      )}
      {loading && !store && (
        <Stack data-testid="gift-cards-buy-loading" sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} aria-label={t('mweb.a11y.loading')} />
        </Stack>
      )}
      {store && !store.design && (
        <Alert data-testid="gift-cards-unavailable" severity="info">
          {t('mweb.giftCards.unavailable')}
        </Alert>
      )}
      {store?.design && <BuyForm store={store} design={store.design} />}
      <HowItWorksCard />
    </Stack>
  );
}
