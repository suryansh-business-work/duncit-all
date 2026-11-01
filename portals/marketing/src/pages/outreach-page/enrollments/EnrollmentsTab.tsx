import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { isEnrollmentStatus } from '../copy';
import { OUTREACH_ENROLLMENTS_TABLE, type OutreachEnrollment } from '../queries';
import { getEnrollmentColumns } from './enrollmentColumns';

const getRowId = (row: OutreachEnrollment) => row.id;

/** The pins a URL asks for: `?sequence=<id>`, `?status=PAUSED`. A status that names nothing is ignored. */
export function pinnedEnrollmentFilters(params: URLSearchParams): TableFilterValue[] {
  const filters: TableFilterValue[] = [];
  const sequence = params.get('sequence');
  if (sequence) filters.push({ field: 'sequence_id', op: 'eq', value: sequence });
  const status = params.get('status');
  if (isEnrollmentStatus(status)) filters.push({ field: 'status', op: 'eq', value: status });
  return filters;
}

/** Every lead in every sequence, newest first, server-paged; a card's link pins one sequence. */
export default function EnrollmentsTab({ canManage }: Readonly<{ canManage: boolean }>) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<OutreachEnrollment>(client, OUTREACH_ENROLLMENTS_TABLE, 'outreachEnrollmentsTable');
  const pins = useMemo(() => pinnedEnrollmentFilters(params), [params]);
  const reload = useCallback(() => refetchRef.current?.(), []);
  const columns = useMemo(
    () => getEnrollmentColumns({ t, formatDateTime, canManage, onChanged: reload }),
    [t, formatDateTime, canManage, reload],
  );

  return (
    <DuncitTable<OutreachEnrollment>
      ariaLabel={t('marketing.outreach.enrollmentsLabel')}
      tableId="outreach-enrollments"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      externalFilters={pins}
      refetchRef={refetchRef}
      emptyText={t('marketing.outreach.emptyEnrollments')}
      searchPlaceholder={t('marketing.outreach.searchEnrollments')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
    />
  );
}
