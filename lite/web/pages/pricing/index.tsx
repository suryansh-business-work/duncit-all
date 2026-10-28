import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { formatMoney, parseApiError } from '@duncit/utils';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { useSignInPrompt } from '../../app/providers/SignInPromptProvider';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';
import { gradientText } from '../landing/Hero';
import { PlanCard } from './PlanCard';

const FREE_FEATURES = ['events', 'guests', 'upi', 'tools', 'pictures'] as const;
const PAID_FEATURES = ['everything', 'branding', 'insights', 'support'] as const;

/** /pricing — the free plan (unlimited during the launch offer) beside Pro, which is coming soon. */
export function PricingPage() {
  const { t } = useWebT();
  const navigate = useNavigate();
  const { requireSignIn } = useSignInPrompt();
  usePageTitle(t('liteWeb.pricing.pageTitle'), t('liteWeb.pricing.subtitle'));
  const start = async () => {
    if (await requireSignIn()) navigate(paths.create);
  };
  return (
    <Stack spacing={{ xs: 4, md: 6 }} sx={{ py: { xs: 2, md: 4 } }} data-testid="pricing-page">
      <Stack component={motion.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} spacing={1.5} sx={{ textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
          {t('liteWeb.pricing.eyebrow')}
        </Typography>
        <Typography variant="h1" sx={(theme) => ({ fontSize: { xs: '2.2rem', md: '3.2rem' }, maxWidth: 640, ...gradientText(theme) })}>
          {t('liteWeb.pricing.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 560, fontSize: { md: '1.1rem' } }}>
          {t('liteWeb.pricing.subtitle')}
        </Typography>
      </Stack>
      <Box role="list" aria-label={t('liteWeb.pricing.plansLabel')} sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, maxWidth: 880, mx: 'auto', width: '100%' }}>
        <Box role="listitem">
          <PlanCard
            index={0}
            highlighted
            name={t('liteWeb.pricing.free.name')}
            badge={t('liteWeb.pricing.free.badge')}
            price={formatMoney(0)}
            tagline={t('liteWeb.pricing.free.tagline')}
            includedLabel={t('liteWeb.pricing.included')}
            features={FREE_FEATURES.map((key) => t(`liteWeb.pricing.free.features.${key}`))}
            testId="pricing-free"
            action={
              <DuncitButton
                variant="contained"
                size="large"
                fullWidth
                sx={{ borderRadius: LITE_RADII.pill }}
                onClick={() => {
                  start().catch((error: unknown) => notifyError(parseApiError(error)));
                }}
                data-testid="pricing-free-cta"
              >
                {t('liteWeb.pricing.free.cta')}
              </DuncitButton>
            }
          />
        </Box>
        <Box role="listitem">
          <PlanCard
            index={1}
            highlighted={false}
            name={t('liteWeb.pricing.paid.name')}
            badge={t('liteWeb.pricing.paid.badge')}
            price={t('liteWeb.pricing.paid.price')}
            tagline={t('liteWeb.pricing.paid.tagline')}
            includedLabel={t('liteWeb.pricing.included')}
            features={PAID_FEATURES.map((key) => t(`liteWeb.pricing.paid.features.${key}`))}
            testId="pricing-paid"
            action={
              <DuncitButton variant="outlined" size="large" fullWidth disabled sx={{ borderRadius: LITE_RADII.pill }} data-testid="pricing-paid-cta">
                {t('liteWeb.pricing.paid.cta')}
              </DuncitButton>
            }
          />
        </Box>
      </Box>
    </Stack>
  );
}
