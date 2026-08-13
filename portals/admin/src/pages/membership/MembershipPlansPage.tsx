import { useState } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import PlansPanel from './PlansPanel';
import BenefitsPanel from './BenefitsPanel';

type PlansTab = 'PLANS' | 'BENEFITS';

/**
 * Admin > Membership > Plans — the whole catalogue the apps render.
 *
 * Two tabs rather than two nav entries, because a tier and the rows that
 * describe it are edited in the same sitting: adding a tier is only half the
 * job until its column is filled in.
 */
export default function MembershipPlansPage() {
  // Bumped on every write in the Plans tab, so the Benefits tab rebuilds its
  // one-input-per-tier editor without a reload.
  const [plansVersion, setPlansVersion] = useState(0);

  const tabs = useTabParam<PlansTab>({
    items: [
      { value: 'PLANS', label: 'Tiers' },
      { value: 'BENEFITS', label: 'Comparison rows' },
    ],
    fallback: 'PLANS',
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h5" fontWeight={700}>
            Membership
          </Typography>
          <Chip size="small" color="warning" label="Coming soon" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          The tiers and comparison table shown in the mobile app and mobile web. Toggle the{' '}
          <code>membership</code> feature flag to control visibility.
        </Typography>
      </Box>

      <Alert severity="info">
        Nothing here bills anyone yet — every plan&apos;s button is disabled in the apps. Members
        who ask to be told when it opens land in <strong>Membership &rarr; Subscribers</strong>.
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
