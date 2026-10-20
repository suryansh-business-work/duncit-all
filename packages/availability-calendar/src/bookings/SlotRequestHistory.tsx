import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { Translate } from '../pricing/types';
import { MY_VENUE_SLOT_REQUEST_HISTORY, type SlotRequestHistoryRow } from './queries';

const HISTORY_LIMIT = 100;

type Outcome = 'PENDING' | 'APPROVED' | 'DECLINED';

/** A still-pending request, else the owner's recorded decision. */
const outcomeOf = (row: SlotRequestHistoryRow): Outcome => {
  if (row.status === 'PENDING') return 'PENDING';
  return row.decision === 'APPROVED' ? 'APPROVED' : 'DECLINED';
};

/** Literal keys per outcome, so the translation gate sees each one. */
function outcomeLabel(t: Translate, outcome: Outcome): string {
  const labels: Record<Outcome, string> = {
    PENDING: t('venuePricing.history.pending'),
    APPROVED: t('venuePricing.history.approved'),
    DECLINED: t('venuePricing.history.declined'),
  };
  return labels[outcome];
}

const OUTCOME_COLOR: Record<Outcome, 'warning' | 'success' | 'default'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  DECLINED: 'default',
};

interface Props {
  venueId: string | null;
  /** What a leftover PENDING request offers — the existing approve / decline. */
  renderPendingAction?: (row: SlotRequestHistoryRow) => ReactNode;
  /** Leave PENDING rows out (the host page lists them with their own approve / decline above). */
  hidePending?: boolean;
}

/**
 * Past slot requests, from before hosts booked instantly. Read-only: nothing
 * creates new ones, and a request still pending keeps its old approve /
 * decline until it expires.
 */
export default function SlotRequestHistory({ venueId, renderPendingAction, hidePending = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat({ timeZoneAware: true });
  const { data, loading, error } = useQuery<{ myVenueSlotRequestHistory: SlotRequestHistoryRow[] }>(
    MY_VENUE_SLOT_REQUEST_HISTORY,
    { variables: { venue_id: venueId, limit: HISTORY_LIMIT }, fetchPolicy: 'cache-and-network' },
  );
  const rows = (data?.myVenueSlotRequestHistory ?? []).filter((row) => !hidePending || row.status !== 'PENDING');

  if (loading && !data) return <Skeleton variant="rounded" height={120} aria-label={t('venuePricing.history.loading')} />;
  if (error) return <Alert severity="error">{t('venuePricing.history.failed')}</Alert>;

  return (
    <Stack spacing={1.5} data-testid="slot-request-history">
      <Alert severity="info">{t('venuePricing.history.intro')}</Alert>
      {rows.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('venuePricing.history.empty')}
        </Typography>
      )}
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {rows.map((row) => (
          <Box component="li" key={row.slot_id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {row.pod_title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {`${row.venue_name} · ${fmt.formatDateTime(row.start_at)} – ${fmt.formatTime(row.end_at)}`}
                </Typography>
                {row.decided_at && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {t('venuePricing.history.decidedAt', { vars: { when: fmt.formatDateTime(row.decided_at) } })}
                  </Typography>
                )}
                {row.decline_reason && (
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    {t('venuePricing.history.reason', { vars: { reason: row.decline_reason } })}
                  </Typography>
                )}
              </Box>
              <Chip size="small" color={OUTCOME_COLOR[outcomeOf(row)]} label={outcomeLabel(t, outcomeOf(row))} />
            </Stack>
            {row.status === 'PENDING' && renderPendingAction ? <Box sx={{ mt: 1 }}>{renderPendingAction(row)}</Box> : null}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
