import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { formatRupees } from '../types';
import { totalsOfSaved, type SavedMultiPodCalculator } from './types';

/** A saved comparison plus the figures its pods add up to — what a row shows. */
interface CalculatorRow {
  id: string;
  name: string;
  pods: number;
  duncit_revenue_total: number;
  venue_receives: number;
  host_receives: number;
  gst_amount: number;
  updated_at: string;
}

interface Props {
  rows: readonly SavedMultiPodCalculator[];
  creating: boolean;
  onCreate: () => void;
  onOpen: (id: string) => void;
}

const searchOf = (row: CalculatorRow) => row.name;

/**
 * Every saved comparison, one per row.
 *
 * The four money columns are computed here from the pods the query already
 * returned, rather than stored on the document: the finance waterfall is the
 * server's to change, and a figure frozen at save time would quietly disagree
 * with the editor the moment a rate moved.
 */
export default function MultiPodList({ rows, creating, onCreate, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();

  const tableRows = useMemo<CalculatorRow[]>(
    () =>
      rows.map((saved) => {
        const totals = totalsOfSaved(saved);
        return {
          id: saved.id,
          name: saved.name,
          pods: totals.pods,
          duncit_revenue_total: totals.duncit_revenue_total,
          venue_receives: totals.venue_receives,
          host_receives: totals.host_receives,
          gst_amount: totals.gst_amount,
          updated_at: saved.updated_at,
        };
      }),
    [rows]
  );

  const fetchRows = useMemo(() => clientTableFetch<CalculatorRow>(tableRows, searchOf), [tableRows]);

  const columns = useMemo<DuncitColumn<CalculatorRow>[]>(
    () => [
      { field: 'name', headerName: t('shell.common.name'), flex: 1, minWidth: 200 },
      { field: 'pods', headerName: t('finance.calculators.podsColumn'), width: 90 },
      {
        field: 'duncit_revenue_total',
        headerName: t('finance.calculators.duncitRevenue'),
        width: 170,
        valueGetter: (row) => formatRupees(row.duncit_revenue_total),
      },
      {
        field: 'venue_receives',
        headerName: t('finance.calculators.venueReceives'),
        width: 170,
        valueGetter: (row) => formatRupees(row.venue_receives),
      },
      {
        field: 'host_receives',
        headerName: t('finance.calculators.hostReceives'),
        width: 170,
        valueGetter: (row) => formatRupees(row.host_receives),
      },
      {
        field: 'gst_amount',
        headerName: t('finance.calculators.gst'),
        width: 150,
        valueGetter: (row) => formatRupees(row.gst_amount),
      },
      {
        field: 'updated_at',
        headerName: t('shell.common.updated'),
        width: 180,
        valueGetter: (row) => formatDateTime(row.updated_at),
      },
    ],
    [t]
  );

  const createButton = (
    <DuncitButton
      variant="contained"
      size="small"
      startIcon={<AddIcon />}
      onClick={onCreate}
      disabled={creating}
    >
      {t('finance.calculators.newComparison')}
    </DuncitButton>
  );

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('finance.calculators.savedComparisonsIntro')}
      </Typography>

      <DuncitTable<CalculatorRow>
        tableId="finance-multi-pod-calculators"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(row) => row.id}
        onRowClick={(row) => onOpen(row.id)}
        toolbarActions={createButton}
        emptyText={t('finance.calculators.noComparisonsYet')}
        searchPlaceholder={t('finance.calculators.searchComparisons')}
        defaultSort={{ field: 'updated_at', dir: 'desc' }}
      />
    </Stack>
  );
}
