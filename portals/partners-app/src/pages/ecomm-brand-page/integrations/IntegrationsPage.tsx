import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { primaryHeroBackground } from '../../../components/primaryHero';
import type { BrandIntegrationProvider } from '../queries';
import ProviderConnections from './ProviderConnections';
import { MY_PARTNER_INTEGRATIONS } from './integrations.queries';

const PROVIDERS: readonly BrandIntegrationProvider[] = ['RAZORPAY', 'SHIPROCKET'];

/**
 * E-Commerce Brand → Integrations: the Razorpay and ShipRocket accounts the
 * partner saves once and picks for each brand in the brand wizard. Saving or
 * re-checking one here reaches every brand that uses it.
 */
export default function IntegrationsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(MY_PARTNER_INTEGRATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const connections = data?.myPartnerIntegrations ?? [];

  const body = () => {
    if (loading && !data) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} role="status" aria-label={t('partners.integrations.loading')}>
          <CircularProgress />
        </Box>
      );
    }
    if (error && !data) {
      return (
        <Alert
          severity="error"
          action={
            <DuncitButton color="inherit" size="small" onClick={() => refetch()}>
              {t('partners.integrations.retry')}
            </DuncitButton>
          }
        >
          {t('partners.integrations.loadFailed')} {parseApiError(error)}
        </Alert>
      );
    }
    return PROVIDERS.map((provider) => (
      <ProviderConnections key={provider} provider={provider} connections={connections.filter((c) => c.provider === provider)} />
    ));
  };

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }} data-testid="integrations-page">
      <Box sx={{ p: 2.5, borderRadius: 2, color: 'common.white', background: primaryHeroBackground }}>
        <Typography variant="overline" sx={{ fontWeight: 800 }}>
          {t('partners.common.partnerTools')}
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
          {t('partners.integrations.title')}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
          {t('partners.integrations.intro')}
        </Typography>
      </Box>
      {body()}
    </Stack>
  );
}
