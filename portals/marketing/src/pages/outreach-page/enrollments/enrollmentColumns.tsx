import { Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { actionsColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import type { Translate } from '@duncit/shell';
import { enumOptions } from '../../social-accounts-page/copy';
import { ENROLLMENT_STATUSES, ENROLLMENT_STATUS_COLORS, ENROLLMENT_STATUS_LABEL, HISTORY_LABEL } from '../copy';
import type { OutreachEnrollment } from '../queries';
import EnrollmentActions from './EnrollmentActions';

type FormatDateTime = (value: Date) => string;

function LeadCell({ row }: Readonly<{ row: OutreachEnrollment }>) {
  return (
    <Stack sx={{ minWidth: 0, justifyContent: 'center', height: '100%' }}>
      <Typography variant="body2" noWrap>
        {row.lead_name}
      </Typography>
      {row.lead_company && (
        <Typography variant="caption" color="text.secondary" noWrap>
          {row.lead_company}
        </Typography>
      )}
    </Stack>
  );
}

/** The newest thing that happened to the enrollment, as a reader says it. */
export function lastEvent(row: OutreachEnrollment, t: Translate): string {
  const last = row.history.at(-1);
  if (!last) return EM_DASH;
  return [t(HISTORY_LABEL[last.kind]), last.text].filter(Boolean).join(': ');
}

interface Options {
  t: Translate;
  formatDateTime: FormatDateTime;
  canManage: boolean;
  onChanged: () => void;
}

/** Who is in which sequence, where they are in it, and what happened last. */
export function getEnrollmentColumns({ t, formatDateTime, canManage, onChanged }: Options): DuncitColumn<OutreachEnrollment>[] {
  const columns: DuncitColumn<OutreachEnrollment>[] = [
    {
      field: 'lead_name',
      headerName: t('marketing.outreach.colLead'),
      type: 'text',
      flex: 1,
      minWidth: 200,
      filterable: false,
      cellRenderer: (row) => <LeadCell row={row} />,
      valueGetter: (row) => [row.lead_name, row.lead_company].filter(Boolean).join(' · '),
    },
    { field: 'sequence_name', headerName: t('marketing.outreach.colSequence'), type: 'text', width: 180, sortable: false, filterable: false },
    {
      field: 'status',
      headerName: t('marketing.outreach.colStatus'),
      type: 'enum',
      options: enumOptions(ENROLLMENT_STATUSES, ENROLLMENT_STATUS_LABEL, t),
      width: 140,
      cellRenderer: (row) => (
        <StatusChip size="small" status={row.status} colorMap={ENROLLMENT_STATUS_COLORS} label={t(ENROLLMENT_STATUS_LABEL[row.status])} />
      ),
      valueGetter: (row) => t(ENROLLMENT_STATUS_LABEL[row.status]),
    },
    {
      field: 'step_index',
      headerName: t('marketing.outreach.colStep'),
      type: 'text',
      width: 110,
      sortable: false,
      filterable: false,
      valueGetter: (row) => t('marketing.outreach.stepOf', { vars: { step: String(Math.min(row.step_index + 1, row.step_count)), count: String(row.step_count) } }),
    },
    {
      field: 'next_at',
      headerName: t('marketing.outreach.colNext'),
      type: 'text',
      width: 170,
      sortable: false,
      filterable: false,
      valueGetter: (row) => (row.next_at ? formatDateTime(new Date(row.next_at)) : EM_DASH),
    },
    {
      field: 'history',
      headerName: t('marketing.outreach.colLast'),
      type: 'text',
      flex: 1,
      minWidth: 220,
      sortable: false,
      filterable: false,
      valueGetter: (row) => (row.error ? row.error : lastEvent(row, t)),
    },
    dateColumn<OutreachEnrollment>({ field: 'created_at', headerName: t('marketing.outreach.colEnrolled'), formatDate: formatDateTime }),
  ];
  if (canManage) {
    columns.push(
      actionsColumn<OutreachEnrollment>({
        width: 150,
        renderExtra: (row) => <EnrollmentActions enrollment={row} onChanged={onChanged} />,
      }),
    );
  }
  return columns;
}
