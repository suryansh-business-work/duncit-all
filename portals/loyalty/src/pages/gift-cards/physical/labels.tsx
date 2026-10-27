import { Chip, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import type { Translator } from '@duncit/app-settings';
import type { PhysicalCardStatus } from './queries';

type ChipColor = 'success' | 'info' | 'default' | 'error' | 'warning' | 'primary';

export const PHYSICAL_STATUS_COLORS: Record<PhysicalCardStatus, ChipColor> = {
  ACTIVE: 'success',
  REDEEMED: 'info',
  EXPIRED: 'default',
  VOID: 'error',
};

/** Literal keys per status — the localization gate greps for `t('…')`. */
export const physicalStatusLabels = (t: Translator['t']): Record<PhysicalCardStatus, string> => ({
  ACTIVE: t('loyalty.physical.statusActive'),
  REDEEMED: t('loyalty.physical.statusRedeemed'),
  EXPIRED: t('loyalty.physical.statusExpired'),
  VOID: t('loyalty.physical.statusVoid'),
});

/** EXPIRED is a read-time fact, not a stored value — the filter offers only what the server can match. */
export const physicalStatusOptions = (t: Translator['t']) => [
  { value: 'ACTIVE', label: t('loyalty.physical.statusActive') },
  { value: 'REDEEMED', label: t('loyalty.physical.statusRedeemed') },
  { value: 'VOID', label: t('loyalty.physical.statusVoid') },
];

export function PhysicalStatusChip({ status, t }: Readonly<{ status: PhysicalCardStatus; t: Translator['t'] }>) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={PHYSICAL_STATUS_COLORS[status]}
      label={physicalStatusLabels(t)[status]}
      sx={{ fontWeight: 800 }}
    />
  );
}

export const EVENT_COLORS: Record<string, ChipColor> = {
  GENERATED: 'primary',
  REDEEMED: 'success',
  VOIDED: 'error',
  REDEEM_FAILED: 'warning',
  PASSCODE_VIEWED: 'default',
  PASSCODES_EXPORTED: 'default',
};

export const eventLabels = (t: Translator['t']): Record<string, string> => ({
  GENERATED: t('loyalty.physical.eventGenerated'),
  REDEEMED: t('loyalty.physical.eventRedeemed'),
  VOIDED: t('loyalty.physical.eventVoided'),
  REDEEM_FAILED: t('loyalty.physical.eventRedeemFailed'),
  PASSCODE_VIEWED: t('loyalty.physical.eventPasscodeViewed'),
  PASSCODES_EXPORTED: t('loyalty.physical.eventPasscodesExported'),
});

export const eventOptions = (t: Translator['t']) =>
  Object.entries(eventLabels(t)).map(([value, label]) => ({ value, label }));

export function EventChip({ type, t }: Readonly<{ type: string; t: Translator['t'] }>) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={EVENT_COLORS[type] ?? 'default'}
      label={eventLabels(t)[type] ?? type}
      sx={{ fontWeight: 800 }}
    />
  );
}

/** The passcode as the lists show it: only its last four digits. */
export function MaskedPasscode({ last4, t }: Readonly<{ last4: string; t: Translator['t'] }>) {
  return (
    <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
      {t('loyalty.physical.passcodeMasked', { vars: { last4 } })}
    </Typography>
  );
}

/** Coins are a count, so they read like money without a symbol (1 coin = 1 rupee). */
export const formatCoins = (n: number) => formatMoney(n, { symbol: '' });
