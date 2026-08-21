import { Box, Chip, Typography } from '@mui/material';
import { EM_DASH, dateColumn, type DuncitColumn } from '@duncit/table';
import { formatINR } from '@duncit/utils';
import { STEP_LABELS, stepLabel } from './funnel-steps';
import { locationOf } from './clickColumns';
import type { ShortLinkJourneyRow } from '../queries';

const DATE_TIME_FORMAT = 'd MMM yyyy, HH:mm';

/** Only the end of the funnel is a win; everything before it is a drop-off. */
const stepColor = (step: string) => {
  if (step === 'PAID') return 'success';
  if (step === 'CHECKOUT_STARTED') return 'warning';
  return 'default';
};

const renderVisitor = (row: ShortLinkJourneyRow) => {
  if (!row.user_id) {
    return (
      <Typography variant="body2" color="text.secondary">
        Not signed in
      </Typography>
    );
  }
  return (
    <Box sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" fontWeight={600} component="div">
        {row.user_name ?? 'Unnamed'}
      </Typography>
      {row.user_email && (
        <Typography variant="caption" color="text.secondary" component="div">
          {row.user_email}
        </Typography>
      )}
    </Box>
  );
};

const renderStep = (row: ShortLinkJourneyRow) => (
  <Chip size="small" label={stepLabel(row.furthest_step)} color={stepColor(row.furthest_step)} />
);

/**
 * What this visitor spent in total, and how many purchases it took.
 *
 * The count matters: one person can buy more than once through the same link,
 * and a bare figure reads as a single sale. Open the row to see each payment.
 */
const renderPaid = (row: ShortLinkJourneyRow) => {
  const count = row.conversions?.length ?? 0;
  if (row.converted_amount === null || row.converted_amount === undefined) {
    return (
      <Typography variant="body2" color="text.secondary">
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Box sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" fontWeight={600} component="div">
        {formatINR(row.converted_amount)}
      </Typography>
      {count > 1 && (
        <Typography variant="caption" color="text.secondary" component="div">
          {count} payments
        </Typography>
      )}
    </Box>
  );
};

export function getJourneyColumns(): DuncitColumn<ShortLinkJourneyRow>[] {
  return [
    dateColumn<ShortLinkJourneyRow>({
      field: 'clicked_at',
      headerName: 'Clicked',
      hide: false,
      width: 180,
      format: DATE_TIME_FORMAT,
    }),
    {
      field: 'user_name',
      headerName: 'Who',
      sortable: false,
      minWidth: 200,
      cellRenderer: renderVisitor,
      valueGetter: (row) => row.user_name ?? row.user_email ?? 'Not signed in',
    },
    {
      field: 'furthest_step',
      headerName: 'Got as far as',
      sortable: false,
      minWidth: 200,
      filter: {
        type: 'select',
        options: Object.entries(STEP_LABELS).map(([value, label]) => ({ value, label })),
      },
      cellRenderer: renderStep,
      valueGetter: (row) => stepLabel(row.furthest_step),
    },
    {
      field: 'converted_amount',
      headerName: 'Paid',
      width: 130,
      cellRenderer: renderPaid,
      valueGetter: (row) =>
        row.converted_amount === null || row.converted_amount === undefined
          ? EM_DASH
          : formatINR(row.converted_amount),
    },
    { field: 'platform', headerName: 'Came from', minWidth: 150 },
    { field: 'country', headerName: 'Location', minWidth: 180, valueGetter: locationOf },
  ];
}
