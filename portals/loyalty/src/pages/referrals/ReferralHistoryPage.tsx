import { useApolloClient } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import TablePageHeader from '../../components/TablePageHeader';
import { useCountedFetch } from '../../lib/useCountedFetch';
import ReferralsTable from './ReferralsTable';
import ReferrersTable from './ReferrersTable';
import { REFERRALS_TABLE, REFERRERS_TABLE, type ReferralRow, type ReferrerRow } from './queries';

/** A sub-heading for the second table on the page, with its own match count. */
function SectionHeading({ title, caption, total }: Readonly<{ title: string; caption: string; total: number | null }>) {
  return (
    <Stack spacing={0.25}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {total != null && <Chip size="small" label={total} />}
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {caption}
      </Typography>
    </Stack>
  );
}

/**
 * Loyalty > Refer & Earn > Referrals — who referred whom, and every member's
 * code with what it has brought in. Both search by code, name, email or phone.
 */
export default function ReferralHistoryPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const history = useCountedFetch(useApolloTableFetch<ReferralRow>(client, REFERRALS_TABLE, 'referralsTable'));
  const referrers = useCountedFetch(useApolloTableFetch<ReferrerRow>(client, REFERRERS_TABLE, 'referrersTable'));

  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        <TablePageHeader
          icon={<CampaignIcon color="primary" />}
          title={t('loyalty.referrals.historyTitle')}
          total={history.total}
        />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('loyalty.referrals.historyCaption')}
        </Typography>
        <ReferralsTable fetchRows={history.fetchRows} />
      </Stack>
      <Stack spacing={1.5}>
        <SectionHeading
          title={t('loyalty.referrals.referrersTitle')}
          caption={t('loyalty.referrals.referrersCaption')}
          total={referrers.total}
        />
        <ReferrersTable fetchRows={referrers.fetchRows} />
      </Stack>
    </Stack>
  );
}
