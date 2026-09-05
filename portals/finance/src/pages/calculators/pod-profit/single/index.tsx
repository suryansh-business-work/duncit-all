import { useQuery } from '@apollo/client/react';
import { Alert, Divider, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import SingleCalculatorPanel from './SingleCalculatorPanel';
import SavedCalculatorsTable from '../saved/SavedCalculatorsTable';
import { POD_CALCULATORS } from '../saved/queries';
import { useOpenParam } from '../saved/useOpenParam';
import type { SavedPodCalculator } from '../saved/types';

/** Which saved calculation is loaded. Its own key so it never collides with the
 * multi tab's `?calculator=` or the strip's `selectedtab`. */
const OPEN_PARAM = 'calculation';

/**
 * The Single pod tab: the calculator, and the library of saved ones under it.
 *
 * Unlike the multi tab, the calculator is not behind a row click — a quick
 * estimate is what this tab is mostly used for, and it should cost no clicks.
 * The table is a library you save into and load from.
 */
export default function SinglePodTab() {
  const { t } = useTranslation();
  const [openId, setOpen] = useOpenParam(OPEN_PARAM);

  const { data, loading, error, refetch } = useQuery<any>(POD_CALCULATORS, {
    variables: { kind: 'SINGLE' },
    fetchPolicy: 'cache-and-network',
  });

  const rows: SavedPodCalculator[] = data?.podCalculators ?? [];
  const open = rows.find((row) => row.id === openId) ?? null;


  if (error) return <Alert severity="error">{error.message}</Alert>;

  if (loading && !data) return <Skeleton variant="rounded" height={320} />;

  return (
    <Stack spacing={2}>
      {/* Keyed on the open row: loading a different one remounts the calculator,
          so its state seeds from that row rather than an effect copying new
          props over old state. */}
      <SingleCalculatorPanel
        key={open?.id ?? 'scratch'}
        saved={open}
        onOpen={setOpen}
        onSaved={() => {
          refetch().catch(() => undefined);
        }}
      />

      <Divider />

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('finance.calculators.savedCalculationsIntro')}
      </Typography>

      <SavedCalculatorsTable
        kind="SINGLE"
        rows={rows}
        emptyText={t('finance.calculators.noCalculationsYet')}
        onOpen={setOpen}
        toolbarActions={null}
      />
    </Stack>
  );
}
