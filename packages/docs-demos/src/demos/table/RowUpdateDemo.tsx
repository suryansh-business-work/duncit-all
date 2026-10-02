import { useMemo, useRef, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';

export interface MeetingRowMock {
  id: string;
  request_no: string;
  applicant: string;
  status: 'REQUESTED' | 'SCHEDULED' | 'DONE';
}

export interface RowUpdateMock {
  rows: MeetingRowMock[];
  /** The row an action lands on, and what its mutation answers with. */
  update: MeetingRowMock;
}

const STATUS_COLOR: Record<MeetingRowMock['status'], 'default' | 'info' | 'success'> = {
  REQUESTED: 'default',
  SCHEDULED: 'info',
  DONE: 'success',
};

const meetingRowId = (row: MeetingRowMock) => row.id;

const renderStatus = (row: MeetingRowMock) => (
  <Chip size="small" color={STATUS_COLOR[row.status]} label={row.status} />
);

const MEETING_COLUMNS: DuncitColumn<MeetingRowMock>[] = [
  { field: 'request_no', headerName: 'Request', type: 'text', minWidth: 160 },
  { field: 'applicant', headerName: 'Applicant', type: 'text', flex: 1, minWidth: 150 },
  {
    field: 'status',
    headerName: 'Status',
    type: 'enum',
    options: [
      { value: 'REQUESTED', label: 'Requested' },
      { value: 'SCHEDULED', label: 'Scheduled' },
      { value: 'DONE', label: 'Done' },
    ],
    width: 140,
    cellRenderer: renderStatus,
    valueGetter: (row) => row.status,
  },
];

/**
 * The real DuncitTable, driven the way a page drives it after a mutation.
 *
 * `updateRowRef` is filled by the table; the button hands it the row a mutation
 * would have answered with. Nothing is fetched — the row is replaced in place,
 * and because renderer columns are never-equal the Status chip repaints with
 * it. Every other row keeps its identity and is left alone.
 */
export function RowUpdateDemo({ rows, update }: Readonly<{ rows: MeetingRowMock[]; update: MeetingRowMock }>) {
  const updateRowRef = useRef<((row: MeetingRowMock) => void) | null>(null);
  const [applied, setApplied] = useState(0);
  const fetchRows = useMemo(
    () => clientTableFetch(rows, (row) => `${row.request_no} ${row.applicant}`, MEETING_COLUMNS),
    [rows],
  );

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <DuncitButton
          variant="contained"
          size="small"
          onClick={() => {
            updateRowRef.current?.(update);
            setApplied((n) => n + 1);
          }}
        >
          Apply the mutation result
        </DuncitButton>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {applied === 0
            ? 'Nothing applied yet.'
            : `Applied ${applied}× — ${update.request_no} is now ${update.status}, with no fetch.`}
        </Typography>
      </Stack>
      <DuncitTable<MeetingRowMock>
        tableId="docs-demo-row-update"
        columns={MEETING_COLUMNS}
        fetchRows={fetchRows}
        getRowId={meetingRowId}
        updateRowRef={updateRowRef}
        emptyText="No meetings"
      />
    </Stack>
  );
}
