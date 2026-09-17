import { Box, Tooltip, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import type { useTranslation } from '@duncit/app-settings';
import { waMoney, waRate } from '../helpers';
import type { WaLogRow } from '../queries';

export type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Both vocabularies in one map, because one table now carries both. SCHEDULED
 * has not happened yet and CANCELLED never will; SKIPPED stays grey because
 * nobody was billed and nothing went wrong.
 */
export const LOG_STATUS_COLORS: StatusColorMap = {
  SCHEDULED: 'info',
  SENDING: 'warning',
  SENT: 'success',
  FAILED: 'error',
  SKIPPED: 'default',
  CANCELLED: 'default',
};

/** A campaign send is the deliberate one, so it is the one that carries colour. */
const KIND_COLORS: StatusColorMap = { CAMPAIGN: 'primary' };

interface KindProps {
  row: WaLogRow;
  /** One localized label per kind, computed once by the column builder. */
  labels: Readonly<Record<string, string>>;
}

/** What started this send, in one word. */
export function KindCell({ row, labels }: Readonly<KindProps>) {
  return (
    <StatusChip status={row.kind} label={labels[row.kind] ?? row.kind} colorMap={KIND_COLORS} />
  );
}

/**
 * What it was: the name somebody gave it over the thing the code addresses —
 * the AiSensy campaign for a campaign send, the scenario key for an automatic
 * one, which is the id that survives a campaign being renamed.
 */
export function SendCell({ row }: Readonly<{ row: WaLogRow }>) {
  const mono = row.kind === 'AUTOMATIC';
  return (
    <Box sx={{ minWidth: 0, lineHeight: 1.25, py: 0.5 }}>
      <Typography variant="body2" component="div" noWrap title={row.name} sx={{
        fontWeight: 700
      }}>
        {row.name || EM_DASH}
      </Typography>
      <Typography
        variant="caption"
        component="div"
        noWrap
        title={row.reference}
        sx={{
          color: "text.secondary",
          fontFamily: mono ? 'monospace' : undefined,
          fontSize: 12
        }}>
        {row.reference}
      </Typography>
    </Box>
  );
}

/**
 * How many of the people it walked over it actually reached. An automatic
 * message is its own audience of one, so the fraction reads the same way on
 * both kinds of row — and the failures and skips sit under it rather than in
 * two more columns that are 0 on nearly every line.
 */
export function ReachCell({ row, t }: Readonly<{ row: WaLogRow; t: Translate }>) {
  const missed = row.failed_count + row.skipped_count;
  return (
    <Box sx={{ lineHeight: 1.25, py: 0.5 }}>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums'
        }}>
        {row.sent_count.toLocaleString()} / {row.recipient_count.toLocaleString()}
      </Typography>
      {missed > 0 && (
        <Typography variant="caption" component="div" sx={{
          color: "text.secondary"
        }}>
          {t('marketingWhatsapp.logs.reachHint', {
            vars: {
              failed: row.failed_count.toLocaleString(),
              skipped: row.skipped_count.toLocaleString(),
            },
          })}
        </Typography>
      )}
    </Box>
  );
}

/**
 * The column the tab exists for: why somebody did not get it. Blank on a send
 * that went out cleanly, and the whole answer on anything else, so it is given
 * room and wraps rather than being cut off.
 */
export function ReasonCell({ row }: Readonly<{ row: WaLogRow }>) {
  if (!row.reason) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Tooltip title={row.reason}>
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
        {row.reason}
      </Typography>
    </Tooltip>
  );
}

interface CostProps {
  row: WaLogRow;
  /** The symbol the rate card is kept in. */
  currency: string;
  t: Translate;
}

/** What it cost, with the rate it froze underneath — a total with no rate
 * beside it cannot be checked against the rate card. */
export function CostCell({ row, currency, t }: Readonly<CostProps>) {
  const rateText =
    row.msg_rate > 0
      ? t('marketingWhatsapp.logs.perMessage', { vars: { rate: waRate(row.msg_rate, currency) } })
      : t('marketingWhatsapp.logs.noRate');
  return (
    <Box sx={{ lineHeight: 1.25, py: 0.5 }}>
      <Typography variant="body2" component="div" sx={{
        fontWeight: 700
      }}>
        {waMoney(row.cost, currency)}
      </Typography>
      <Typography variant="caption" component="div" sx={{
        color: "text.secondary"
      }}>
        {rateText}
      </Typography>
    </Box>
  );
}
