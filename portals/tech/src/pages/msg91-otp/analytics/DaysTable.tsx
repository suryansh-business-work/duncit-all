import { useMemo } from 'react';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { formatDay, useTranslation } from '@duncit/app-settings';
import SectionCard from '../../stress-testing/components/SectionCard';
import type { Msg91WidgetDay } from '../queries';
import { channelLabels } from '../channels';

const getRowId = (row: Msg91WidgetDay) => row.date;
const searchOf = (row: Msg91WidgetDay) => `${row.date} ${formatDay(row.date)}`;

type CountField = 'total' | 'verified' | 'token_verified' | 'retries';

const countColumn = (field: CountField, headerName: string): DuncitColumn<Msg91WidgetDay> => ({
  field,
  headerName,
  width: 120,
  type: 'number',
  valueGetter: (row) => row[field],
});

/** The window day by day: traffic, outcomes and what each channel carried. */
export default function DaysTable({ days }: Readonly<{ days: readonly Msg91WidgetDay[] }>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<Msg91WidgetDay>[]>(
    () => [
      {
        field: 'date',
        headerName: t('tech.msg91.colDate'),
        width: 150,
        type: 'text',
        valueGetter: (row) => formatDay(row.date),
      },
      countColumn('total', t('tech.msg91.colRequests')),
      countColumn('verified', t('tech.msg91.colVerified')),
      countColumn('token_verified', t('tech.msg91.colTokenVerified')),
      countColumn('retries', t('tech.msg91.colRetries')),
      ...channelLabels(t).map<DuncitColumn<Msg91WidgetDay>>(({ key, label }) => ({
        field: key,
        headerName: label,
        width: 110,
        type: 'number',
        valueGetter: (row) => row[key],
      })),
    ],
    [t]
  );
  const fetchRows = useMemo(() => clientTableFetch<Msg91WidgetDay>(days, searchOf, columns), [days, columns]);

  return (
    <SectionCard title={t('tech.msg91.daysTitle')}>
      <DuncitTable<Msg91WidgetDay>
        tableId="tech-msg91-otp-days"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('tech.msg91.noTraffic')}
        defaultSort={{ field: 'date', dir: 'desc' }}
        searchPlaceholder={t('tech.msg91.searchDays')}
      />
    </SectionCard>
  );
}
