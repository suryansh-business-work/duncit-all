import { Box, Chip, Typography } from '@mui/material';
import { EM_DASH, dateColumn, type DuncitColumn } from '@duncit/table';
import { formatINR } from '@duncit/utils';
import { STEP_LABELS, stepLabel } from './funnel-steps';
import { locationOf } from './clickColumns';
import type { ShortLinkJourneyRow } from '../queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

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
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>Not signed in
              </Typography>
    );
  }
  return (
    <Box sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" component="div" sx={{
        fontWeight: 600
      }}>
        {row.user_name ?? 'Unnamed'}
      </Typography>
      {row.user_email && (
        <Typography variant="caption" component="div" sx={{
          color: "text.secondary"
        }}>
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
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Box sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" component="div" sx={{
        fontWeight: 600
      }}>
        {formatINR(row.converted_amount)}
      </Typography>
      {count > 1 && (
        <Typography variant="caption" component="div" sx={{
          color: "text.secondary"
        }}>
          {count} payments
        </Typography>
      )}
    </Box>
  );
};

export function getJourneyColumns(t: Translate): DuncitColumn<ShortLinkJourneyRow>[] {
  return [
    dateColumn<ShortLinkJourneyRow>({
      field: 'clicked_at',
      headerName: t('marketing.common.clicked'),
      hide: false,
      width: 180,
      format: DATE_TIME_FORMAT,
    }),
    {
      // The visitor's name is read per row from the users collection — nothing stored on the click to order or match on.
      field: 'user_name',
      headerName: t('marketing.shortLinks.who'),
      type: 'text',
      sortable: false,
      filterable: false,
      minWidth: 200,
      cellRenderer: renderVisitor,
      valueGetter: (row) => row.user_name ?? row.user_email ?? 'Not signed in',
    },
    {
      field: 'furthest_step',
      headerName: t('marketing.shortLinks.gotAsFarAs'),
      // Derived from the journey trail per row; the server filters on it, but there is no stored value to order by.
      sortable: false,
      minWidth: 200,
      type: 'enum',
      options: Object.entries(STEP_LABELS).map(([value, label]) => ({ value, label })),
      cellRenderer: renderStep,
      valueGetter: (row) => stepLabel(row.furthest_step),
    },
    {
      field: 'converted_amount',
      headerName: t('marketing.shortLinks.paid'),
      type: 'number',
      width: 130,
      cellRenderer: renderPaid,
      valueGetter: (row) =>
        row.converted_amount === null || row.converted_amount === undefined
          ? EM_DASH
          : formatINR(row.converted_amount),
    },
    { field: 'platform', headerName: t('marketing.shortLinks.cameFrom'), type: 'text', minWidth: 150 },
    { field: 'country', headerName: t('marketing.common.location'), type: 'text', minWidth: 180, valueGetter: locationOf },
  ];
}
