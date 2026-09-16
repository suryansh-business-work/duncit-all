import { InputAdornment, Stack, TextField, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import {
  TICKET_DISCOUNT_MIN_TICKETS,
  type TicketDiscountLabels,
  type TicketDiscountTier,
  type TicketDiscountTierErrors,
} from '@duncit/utils';

/** The field messages one tier row shows, already translated by the form (shared with the native twin). */
export type TicketDiscountTierRowErrors = TicketDiscountTierErrors;

export type TicketDiscountTierRowProps = Readonly<{
  index: number;
  tier: TicketDiscountTier;
  maxTickets: number;
  maxPct: number;
  labels: TicketDiscountLabels;
  /** Formatted price of one ticket at this tier; the caption is left out without it. */
  perTicket?: string;
  errors?: TicketDiscountTierRowErrors;
  disabled: boolean;
  onChange: (tier: TicketDiscountTier) => void;
  onRemove: () => void;
}>;

/** The lowest discount a stored tier may give — a 0% tier is the base row, which is never stored. */
const MIN_DISCOUNT_PCT = 1;

/**
 * A number input's text as a whole number. A cleared or unreadable field stores
 * 0, so validation names the problem (TICKETS_MIN / PCT_MIN) instead of the
 * row silently keeping the value the user just deleted.
 */
function toWholeNumber(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * One stored tier of the multi-ticket discount: how many tickets a single
 * booking needs, the discount it then gets, and the remove button.
 */
export function TicketDiscountTierRow({
  index,
  tier,
  maxTickets,
  maxPct,
  labels,
  perTicket,
  errors,
  disabled,
  onChange,
  onRemove,
}: TicketDiscountTierRowProps) {
  return (
    <Stack
      spacing={0.5}
      data-testid={`ticket-discount-tier-${index}`}
      sx={{ p: 1.5, borderRadius: '16px', border: 1, borderColor: 'divider' }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <TextField
          type="number"
          size="small"
          label={labels.ticketsLabel}
          value={tier.min_tickets}
          onChange={(e) => onChange({ ...tier, min_tickets: toWholeNumber(e.target.value) })}
          error={Boolean(errors?.min_tickets)}
          helperText={errors?.min_tickets}
          disabled={disabled}
          sx={{ flex: 1, minWidth: 0 }}
          slotProps={{
            htmlInput: {
              min: TICKET_DISCOUNT_MIN_TICKETS,
              max: maxTickets,
              step: 1,
              'data-testid': `ticket-discount-tier-min-${index}`,
            },
          }}
        />
        <TextField
          type="number"
          size="small"
          label={labels.discountLabel}
          value={tier.discount_pct}
          onChange={(e) => onChange({ ...tier, discount_pct: toWholeNumber(e.target.value) })}
          error={Boolean(errors?.discount_pct)}
          helperText={errors?.discount_pct ?? labels.maxHint(maxPct)}
          disabled={disabled}
          sx={{ flex: 1, minWidth: 0 }}
          slotProps={{
            input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
            htmlInput: {
              min: MIN_DISCOUNT_PCT,
              max: maxPct,
              step: 1,
              'data-testid': `ticket-discount-tier-pct-${index}`,
            },
          }}
        />
        <DuncitIconButton
          aria-label={labels.removeTier}
          onClick={onRemove}
          disabled={disabled}
          size="small"
          sx={{ mt: 0.5 }}
          data-testid={`ticket-discount-tier-remove-${index}`}
        >
          <DeleteOutlineIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
      {perTicket !== undefined && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {labels.perTicket(perTicket)}
        </Typography>
      )}
    </Stack>
  );
}
