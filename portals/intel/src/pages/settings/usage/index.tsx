import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Grid, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import type { IntelUsageRow } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { SectionCard, StatCard } from '@duncit/ui';
import { INTEL_USAGE, type UsageData } from '../../../graphql/admin';

const DAYS = [7, 30, 90] as const;
const USD = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });
const usd = (n: number) => USD.format(n);
const searchOf = (r: IntelUsageRow) => r.key;

function UsageTable({ id, title, rows }: Readonly<{ id: string; title: string; rows: IntelUsageRow[] }>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<IntelUsageRow>[]>(
    () => [
      { field: 'key', headerName: title, flex: 1, minWidth: 180, type: 'text', valueGetter: (r) => r.key },
      { field: 'calls', headerName: t('intel.settings.usage.calls'), width: 110, type: 'number', valueGetter: (r) => r.calls },
      { field: 'tokens', headerName: t('intel.settings.usage.tokens'), width: 130, type: 'number', valueGetter: (r) => r.tokens },
      { field: 'cost_usd', headerName: t('intel.settings.usage.cost'), width: 130, type: 'number', valueGetter: (r) => r.cost_usd, cellRenderer: (r) => usd(r.cost_usd) },
    ],
    [t, title]
  );
  const fetchRows = useMemo(() => clientTableFetch<IntelUsageRow>(rows, searchOf, columns), [rows, columns]);
  return <DuncitTable<IntelUsageRow> ariaLabel={title} tableId={`intel-usage-${id}`} columns={columns} fetchRows={fetchRows} getRowId={(r) => r.key} emptyText={t('intel.settings.usage.empty')} defaultSort={{ field: 'cost_usd', dir: 'desc' }} defaultPageSize={10} />;
}

/** Settings › API Usage & Cost: what Intel's AI calls cost, from the shared OpenAI usage log (Intel tasks only). */
export default function UsageSection() {
  const { t } = useTranslation();
  const [days, setDays] = useState<number>(30);
  const { data, loading } = useQuery<UsageData>(INTEL_USAGE, { variables: { days }, fetchPolicy: 'cache-and-network' });
  const u = data?.intelUsage;
  return (
    <SectionCard title={t('intel.settings.sections.usage')} subtitle={t('intel.settings.usage.subtitle')}>
      <Stack spacing={2}>
        <TextField select size="small" label={t('intel.settings.usage.period')} value={days} onChange={(e) => setDays(Number(e.target.value))} sx={{ maxWidth: 220 }}>
          {DAYS.map((d) => <MenuItem key={d} value={d}>{t('intel.settings.usage.lastDays', { vars: { count: d } })}</MenuItem>)}
        </TextField>
        {loading && !u && <Skeleton variant="rounded" height={120} />}
        {u && (
          <>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 4 }}><StatCard label={t('intel.settings.usage.calls')} value={u.total_calls} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><StatCard label={t('intel.settings.usage.tokens')} value={u.total_tokens} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><StatCard label={t('intel.settings.usage.cost')} value={usd(u.total_cost_usd)} hint={t('intel.settings.usage.costHint')} /></Grid>
            </Grid>
            <Typography variant="subtitle2">{t('intel.settings.usage.byTask')}</Typography>
            <UsageTable id="task" title={t('intel.settings.usage.task')} rows={u.by_task} />
            <Typography variant="subtitle2">{t('intel.settings.usage.byModel')}</Typography>
            <UsageTable id="model" title={t('intel.settings.usage.model')} rows={u.by_model} />
            <Typography variant="subtitle2">{t('intel.settings.usage.byDay')}</Typography>
            <UsageTable id="day" title={t('intel.settings.usage.day')} rows={u.by_day} />
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
