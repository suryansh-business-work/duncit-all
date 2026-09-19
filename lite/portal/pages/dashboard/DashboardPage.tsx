import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import { PageHeader, QueryGuard, StatCard } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { usePortalT } from '../../../shared/i18n';
import { LITE_ADMIN_STATS, type LiteAdminStats } from '../../graphql/admin';
import { QuickLinks } from './QuickLinks';
import { STAT_TILES } from './stat-tiles';

function StatGrid({ stats }: Readonly<{ stats: LiteAdminStats }>) {
  const { t, locale } = usePortalT();
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
      {STAT_TILES.map((tile) => {
        const Icon = tile.icon;
        const raw = stats[tile.key];
        const value = tile.money ? formatMoney(raw) : numberFormat.format(raw);
        return <StatCard key={tile.key} label={t(tile.labelKey)} value={value} icon={<Icon />} iconColor="primary.main" to={tile.to} testId={`stat-${tile.key}`} />;
      })}
    </Box>
  );
}

export function DashboardPage() {
  const { t } = usePortalT();
  const { data, loading, error } = useQuery<{ liteAdminStats: LiteAdminStats }>(LITE_ADMIN_STATS, { fetchPolicy: 'cache-and-network' });
  const stats = data?.liteAdminStats;
  return (
    <Stack spacing={3}>
      <PageHeader title={t('litePortal.dashboard.title')} subtitle={t('litePortal.dashboard.subtitle')} />
      <QueryGuard loading={loading && !stats} error={error} loadingLabel={t('lite.common.loading')}>
        {() => (stats ? <StatGrid stats={stats} /> : null)}
      </QueryGuard>
      <QuickLinks />
    </Stack>
  );
}
