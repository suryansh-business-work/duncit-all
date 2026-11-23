import { Alert, Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import { buildEarningsStatement, formatStatementMoney } from '@duncit/utils';
import { usePodFormData } from '../context';
import { useFormEarnings } from '../finance/useFormEarnings';
import { projectionRows, type ProjectionRow } from '../finance/projectionRows';
import { useTranslation } from '../i18n/useTranslation';
import { ProjectionFailedAlert, ViabilityAlert } from './EarningsVerdict';

interface Props {
  /** Duncit products attached to the pod (rupees) — deducted from the payout. */
  productCost: number;
}

const ROW_WEIGHT: Record<ProjectionRow['kind'], number> = {
  collection: 700,
  deduction: 500,
  total: 600,
  payout: 700,
};

/** One row: label + formula on the left, the amount on the right. A
 * deduction reads with a leading minus; a venue not yet priced shows a dash. */
function Row({ row, money }: Readonly<{ row: ProjectionRow; money: (v: number) => string }>) {
  let amount = '—';
  if (row.amount !== null) {
    amount = row.kind === 'deduction' ? `− ${money(row.amount)}` : money(row.amount);
  }
  const color = row.kind === 'payout' ? 'accent.main' : 'text.primary';
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: ROW_WEIGHT[row.kind] }}>
          {row.label}
        </Typography>
        {row.formula && (
          <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
            {row.formula}
          </Typography>
        )}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: ROW_WEIGHT[row.kind], color, whiteSpace: 'nowrap' }}>
        {amount}
      </Typography>
    </Stack>
  );
}

/**
 * The admin editor's live earnings projection for a paid pod.
 *
 * Every figure is the server's own waterfall — the same engine that settles
 * the pod — grouped by the statement builder mWeb and the app render at
 * Create-a-Pod Step 4. It used to run its own fee-then-GST arithmetic here,
 * which priced the platform fee off a different base than settlement does
 * and knew nothing of the club admin's cut, the host's commission or the
 * venue's slot price: a "final payout" nobody would ever be paid.
 *
 * A free pod collects nothing, so there is nothing to project: the panel is
 * not drawn and the server is not asked.
 *
 * The server's verdict rides on the same projection: when it says the pod
 * would be refused, the reason, the venue's minimum business and the lowest
 * ticket price that works are shown here, and Save waits (useEconomicsGate).
 */
export default function EarningsProjection({ productCost }: Readonly<Props>) {
  const { t } = useTranslation();
  const { finance } = usePodFormData();
  const { projection, stale, idle, failed, retry, podAmount, venue, isFree } = useFormEarnings(true);
  const symbol = finance?.currency_symbol || '₹';
  const money = (value: number) => formatStatementMoney(value, symbol);
  if (isFree) return null;

  const body = () => {
    if (idle) {
      return (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('podForm.priceBreakdown.prompt')}
        </Typography>
      );
    }
    if (failed) return <ProjectionFailedAlert onRetry={retry} />;
    // During the debounce window the previous waterfall would sit beside labels
    // built from the live inputs — treat it as loading instead. Not idle and
    // not failed, a missing projection is one still on its way.
    if (!projection || stale) {
      return (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <CircularProgress size={16} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('podForm.priceBreakdown.loading')}
          </Typography>
        </Stack>
      );
    }
    const w = projection.waterfall;
    const statement = buildEarningsStatement(w, { has_venue: venue === 'slot', symbol, t });
    const rows = projectionRows({ statement, waterfall: w, venue, productCost, money, t });
    const payout = rows.at(-1);
    const budget = money(projection.venue_budget);
    return (
      <Stack spacing={1}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('podForm.priceBreakdown.perPerson', {
            vars: { price: money(podAmount), spots: projection.payable_spots },
          })}
        </Typography>
        {rows.map((row) => (
          <Box key={row.key}>
            {(row.kind === 'total' || row.kind === 'payout') && <Divider sx={{ mb: 1 }} />}
            <Row row={row} money={money} />
          </Box>
        ))}
        {venue !== 'none' && (
          <Alert severity="info" icon={false} data-testid="earnings-venue-budget">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('podForm.priceBreakdown.venueBudget')}
              {' · '}
              {t('podForm.priceBreakdown.venueBudgetValue', { vars: { amount: budget } })}
            </Typography>
            <Typography variant="caption">
              {t('podForm.priceBreakdown.venueBudgetHint', { vars: { amount: budget } })}
            </Typography>
          </Alert>
        )}
        <ViabilityAlert verdict={projection} money={money} />
        {/* The server's verdict leaves out attached products; when they alone
            take the payout to ₹0 the admin is still told, without a block. */}
        {projection.viable && payout && payout.amount !== null && payout.amount <= 0 && (
          <Alert severity="error" data-testid="earnings-zero">
            {t('podForm.priceBreakdown.zeroEarnings')}
          </Alert>
        )}
      </Stack>
    );
  };

  return (
    <Stack
      spacing={1.5}
      data-testid="earnings-projection"
      sx={{ p: 2, borderRadius: 1.5, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <InsightsIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('podForm.priceBreakdown.title')}
        </Typography>
      </Stack>
      {body()}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('podForm.priceBreakdown.estimateNote')}
      </Typography>
    </Stack>
  );
}
