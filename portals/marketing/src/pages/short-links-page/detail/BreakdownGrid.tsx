import { Box } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import BreakdownCard from './BreakdownCard';
import type { ShortLinkStats } from '../queries';

const NOTHING_YET = 'No clicks recorded yet.';

interface Props {
  stats: ShortLinkStats;
}

/** Where the clicks came from, on what, and from where — the six lists. */
export default function BreakdownGrid({ stats }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
      }}
    >
      <BreakdownCard
        title={t('marketing.shortLinks.cameFrom')}
        rows={stats.platforms}
        emptyText={NOTHING_YET}
      />
      <BreakdownCard
        title={t('marketing.shortLinks.referrer')}
        rows={stats.referrers}
        emptyText={NOTHING_YET}
      />
      <BreakdownCard
        title={t('marketing.common.country')}
        rows={stats.countries}
        emptyText={NOTHING_YET}
      />
      <BreakdownCard
        title={t('marketing.common.city')}
        rows={stats.cities}
        emptyText={NOTHING_YET}
      />
      <BreakdownCard
        title={t('marketing.shortLinks.device')}
        rows={stats.devices}
        emptyText={NOTHING_YET}
      />
      <BreakdownCard
        title={t('marketing.shortLinks.operatingSystem')}
        rows={stats.oses}
        emptyText={NOTHING_YET}
      />
      <BreakdownCard
        title={t('marketing.shortLinks.browser')}
        rows={stats.browsers}
        emptyText={NOTHING_YET}
      />
    </Box>
  );
}
