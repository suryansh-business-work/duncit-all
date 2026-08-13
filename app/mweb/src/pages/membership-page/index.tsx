import { useQuery } from '@apollo/client';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import PlanCards from './PlanCards';
import ComparisonTable from './ComparisonTable';
import NotifyCard from './NotifyCard';
import { MEMBERSHIP_PRICING, type MembershipPricingData } from './queries';
import { HEADER_DATA } from '../../components/app-header/queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Membership — the tier cards, the full comparison table and the notify-me
 * form. Twin of the native MembershipScreen (rule 27); reached only through
 * the flag-gated sidebar row.
 *
 * Every tier, price and comparison row comes from Admin > Membership, so this
 * page never states a benefit of its own. The CTAs are disabled throughout —
 * membership is announced here, not sold.
 */
export default function MembershipPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ membershipPricing: MembershipPricingData }>(
    MEMBERSHIP_PRICING,
    { fetchPolicy: 'cache-and-network' }
  );
  // Already in the cache from the header, so the email paints with the page.
  const { data: headerData } = useQuery(HEADER_DATA, { fetchPolicy: 'cache-first' });

  const pricing = data?.membershipPricing ?? null;
  const plans = pricing?.plans ?? [];
  const benefits = pricing?.benefits ?? [];

  let body = null;
  if (loading && !pricing) {
    body = (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  } else if (plans.length === 0) {
    body = <Alert severity="info">{t('mweb.membership.empty')}</Alert>;
  } else {
    body = (
      <>
        <PlanCards plans={plans} />
        <ComparisonTable plans={plans} benefits={benefits} />
      </>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" fontWeight={700}>
            {t('mweb.membership.title')}
          </Typography>
          <Chip size="small" color="warning" label={t('mweb.membership.comingSoon')} />
        </Stack>

        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {t('mweb.membership.heading')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('mweb.membership.subheading')}
          </Typography>
        </Box>

        {error && <Alert severity="error">{t('mweb.membership.loadError')}</Alert>}

        {body}

        <NotifyCard
          email={headerData?.me?.email ?? ''}
          subscribed={!!pricing?.is_subscribed}
        />
      </Stack>
    </Box>
  );
}
