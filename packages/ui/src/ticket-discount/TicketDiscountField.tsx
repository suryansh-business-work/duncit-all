import { useRef } from 'react';
import { FormControlLabel, FormHelperText, Stack, Switch, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import {
  TICKET_DISCOUNT_MAX_TIERS,
  nextTicketDiscountTier,
  ticketDiscountRows,
  type TicketDiscountLabels,
  type TicketDiscountTier,
} from '@duncit/utils';
import { TicketDiscountTierRow, type TicketDiscountTierRowErrors } from './TicketDiscountTierRow';

/** Messages the form resolved: `list` for the whole ladder, `rows[i]` for one tier's fields. */
export interface TicketDiscountFieldErrors {
  list?: string;
  rows?: ReadonlyArray<TicketDiscountTierRowErrors | undefined>;
}

export type TicketDiscountFieldProps = Readonly<{
  enabled: boolean;
  tiers: readonly TicketDiscountTier[];
  onEnabledChange: (enabled: boolean) => void;
  onTiersChange: (tiers: TicketDiscountTier[]) => void;
  /** `publicAppSettings.ticket_discount_max_pct`. */
  maxPct: number;
  /** `ticketDiscountMaxTickets(no_of_spots)` from `@duncit/utils`. */
  maxTickets: number;
  labels: TicketDiscountLabels;
  /** The pod's ticket price; with `formatPrice` it adds a per-ticket caption to each tier. */
  unitPrice?: number;
  formatPrice?: (amount: number) => string;
  errors?: TicketDiscountFieldErrors;
  disabled?: boolean;
}>;

/**
 * One stable React key per tier row — never the array index (S6479).
 *
 * A removed row takes its own key with it, so the rows below keep theirs and
 * their inputs are not remounted (which would drop focus mid-edit). A list that
 * grows or shrinks from outside — a form reset, a restored draft — is reconciled
 * by position, minting keys for the new rows at the end.
 */
function useTierRowKeys(count: number) {
  const keys = useRef<string[]>([]);
  const nextId = useRef(0);
  if (keys.current.length !== count) {
    keys.current = Array.from(
      { length: count },
      (_, i) => keys.current[i] ?? `ticket-discount-tier-key-${nextId.current++}`,
    );
  }
  const removeKey = (index: number) => {
    keys.current = keys.current.filter((_, i) => i !== index);
  };
  return { keys: keys.current, removeKey };
}

/** Each tier's formatted price per ticket, by row; empty when the caller gave no price to format. */
function perTicketPrices(
  tiers: readonly TicketDiscountTier[],
  unitPrice: number | undefined,
  formatPrice: ((amount: number) => string) | undefined,
): readonly string[] {
  if (unitPrice === undefined || formatPrice === undefined) return [];
  const [, ...tierRows] = ticketDiscountRows(unitPrice, {
    ticket_discount_enabled: true,
    ticket_discount_tiers: tiers,
  });
  return tierRows.map((row) => formatPrice(row.per_ticket));
}

/**
 * The multi-ticket discount editor: a switch, the fixed "1 ticket · 0%" base
 * row, then one row per stored tier and an "Add tier" button.
 *
 * Controlled and form-library free — the calling form owns the values and runs
 * `ticketDiscountTierIssues` from `@duncit/utils` in its own Zod superRefine,
 * then hands the translated messages back as `errors`. That is what lets the
 * mWeb stepper, the portal pod form and the host's Edit Pod sheet render this
 * one copy (rule 40). Native twin: `app/mobile-app/src/components/create-pod/TicketDiscountField.tsx`
 * (same test ids, rule 27).
 */
export function TicketDiscountField({
  enabled,
  tiers,
  onEnabledChange,
  onTiersChange,
  maxPct,
  maxTickets,
  labels,
  unitPrice,
  formatPrice,
  errors,
  disabled = false,
}: TicketDiscountFieldProps) {
  const { keys, removeKey } = useTierRowKeys(tiers.length);

  const toggle = (checked: boolean) => {
    onEnabledChange(checked);
    if (!checked) {
      onTiersChange([]);
      return;
    }
    if (tiers.length === 0) onTiersChange([nextTicketDiscountTier(tiers, maxPct)]);
  };
  const addTier = () => onTiersChange([...tiers, nextTicketDiscountTier(tiers, maxPct)]);
  const removeTier = (index: number) => {
    removeKey(index);
    onTiersChange(tiers.filter((_, i) => i !== index));
  };
  const changeTier = (index: number, tier: TicketDiscountTier) =>
    onTiersChange(tiers.map((row, i) => (i === index ? tier : row)));
  const perTicket = perTicketPrices(tiers, unitPrice, formatPrice);
  const rows = tiers.map((tier, index) => ({ tier, index, key: keys[index] }));

  return (
    <Stack spacing={1.5} data-testid="ticket-discount-field">
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {labels.title}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(_event, checked) => toggle(checked)}
              disabled={disabled}
              data-testid="ticket-discount-switch"
            />
          }
          label={labels.switchLabel}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {labels.hint}
        </Typography>
      </Stack>
      {enabled && (
        <Stack spacing={1.5}>
          <Typography
            variant="body2"
            data-testid="ticket-discount-base-row"
            sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'action.hover', color: 'text.secondary' }}
          >
            {labels.baseRow}
          </Typography>
          {rows.map(({ tier, index, key }) => (
            <TicketDiscountTierRow
              key={key}
              index={index}
              tier={tier}
              maxTickets={maxTickets}
              maxPct={maxPct}
              labels={labels}
              perTicket={perTicket[index]}
              errors={errors?.rows?.[index]}
              disabled={disabled}
              onChange={(next) => changeTier(index, next)}
              onRemove={() => removeTier(index)}
            />
          ))}
          {errors?.list && (
            <FormHelperText error data-testid="ticket-discount-list-error">
              {errors.list}
            </FormHelperText>
          )}
          <DuncitButton
            startIcon={<AddIcon />}
            onClick={addTier}
            disabled={disabled || tiers.length >= TICKET_DISCOUNT_MAX_TIERS}
            size="small"
            sx={{ alignSelf: 'flex-start' }}
            data-testid="ticket-discount-add-tier"
          >
            {labels.addTier}
          </DuncitButton>
        </Stack>
      )}
    </Stack>
  );
}
