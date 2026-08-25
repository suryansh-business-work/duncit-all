import { useState } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import PlansPanel from './PlansPanel';
import BenefitsPanel from './BenefitsPanel';
import { useTranslation } from '@duncit/shell';

type PlansTab = 'PLANS' | 'BENEFITS';

/**
 * Admin > Membership > Plans — the whole catalogue the apps render.
 *
 * Two tabs rather than two nav entries, because a tier and the rows that
 * describe it are edited in the same sitting: adding a tier is only half the
 * job until its column is filled in.
 */
export default function MembershipPlansPage() {
  const { t } = useTranslation();
  // Bumped on every write in the Plans tab, so the Benefits tab rebuilds its
  // one-input-per-tier editor without a reload.
  const [plansVersion, setPlansVersion] = useState(0);

  const tabs = useTabParam<PlansTab>({
    items: [
      { value: 'PLANS', label: t('admin.membership.tiers') },
      { value: 'BENEFITS', label: t('admin.membership.comparisonRows') },
    ],
    fallback: 'PLANS',
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Membership
          </Typography>
          <Chip size="small" color="warning" label={t('admin.membership.comingSoon')} />
        </Stack>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          The tiers and comparison table shown in the mobile app and mobile web. Toggle the{' '}
          <code>membership</code> feature flag to control visibility.
        </Typography>
      </Box>

      <Alert severity="info">
        Nothing here bills anyone yet — every plan&apos;s button is disabled in the apps. Members
        who ask to be told when it opens land in <strong>{t('admin.membership.subscribersPath')}</strong>.
      </Alert>

      <DuncitTabs {...tabs} />

      {tabs.value === 'PLANS' ? (
        <PlansPanel onChanged={() => setPlansVersion((v) => v + 1)} />
      ) : (
        <BenefitsPanel plansVersion={plansVersion} />
      )}
    </Stack>
  );
}
