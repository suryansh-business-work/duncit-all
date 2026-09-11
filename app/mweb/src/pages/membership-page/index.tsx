import { useQuery } from '@apollo/client/react';
import { Alert, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import PlanCards from './PlanCards';
import ComparisonTable from './ComparisonTable';
import NotifyCard from './NotifyCard';
import { MEMBERSHIP_PRICING, type MembershipPricingData } from './queries';
import PageHeader from '../../components/PageHeader';
import { HEADER_ME } from '../../components/app-header/queries';
import { useTranslation } from '../../i18n/useTranslation';

/** The calm "Coming soon" pill: green text on the tonal green fill. */
const SOON_SX = {
  height: 24,
  fontWeight: 600,
  color: 'primary.main',
  bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.12),
} as const;

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
  const { data: headerData } = useQuery<any>(HEADER_ME, { fetchPolicy: 'cache-first' });

  const pricing = data?.membershipPricing ?? null;
  const plans = pricing?.plans ?? [];
  const benefits = pricing?.benefits ?? [];

  let body = null;
  if (loading && !pricing) {
    body = (
      <Stack
        sx={{
          alignItems: "center",
          py: 4
        }}>
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
    <Stack spacing={2.5} sx={{ maxWidth: 760, mx: 'auto', width: '100%', py: 0.5 }}>
      <PageHeader title={t('mweb.membership.title')} />

      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>
          {t('mweb.membership.heading')}
        </Typography>
        <Chip size="small" label={t('mweb.membership.comingSoon')} sx={SOON_SX} />
      </Stack>

      {error && <Alert severity="error">{t('mweb.membership.loadError')}</Alert>}

      {body}

      <NotifyCard
        email={headerData?.me?.email ?? ''}
        subscribed={!!pricing?.is_subscribed}
      />
    </Stack>
  );
}
