import { Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import type { Translator } from '@duncit/app-settings';
import type { GiftCardCardRow, GiftCardDisplayStatus } from './queries';

/** Name-over-email cell shared by the buyer, recipient, redeemer and user columns. */
export const renderPerson = (name: string, email: string) => (
  <Stack component="span" sx={{ minWidth: 0, lineHeight: 1.2 }}>
    <Typography variant="body2" noWrap component="span" sx={{ fontWeight: 700 }}>
      {name || EM_DASH}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap component="span">
      {email || EM_DASH}
    </Typography>
  </Stack>
);

/** Monospace cell for codes and payment ids. */
export const renderCode = (code: string) => (
  <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
    {code}
  </Typography>
);

/** What the row shows: REDEEMED wins, then a past expiry reads as EXPIRED. */
export const displayStatus = (row: GiftCardCardRow): GiftCardDisplayStatus => {
  if (row.status === 'REDEEMED') return 'REDEEMED';
  if (row.status === 'EXPIRED') return 'EXPIRED';
  if (new Date(row.expires_at).getTime() < Date.now()) return 'EXPIRED';
  return 'ACTIVE';
};

export const STATUS_COLORS: Record<GiftCardDisplayStatus, 'success' | 'info' | 'default'> = {
  ACTIVE: 'success',
  REDEEMED: 'info',
  EXPIRED: 'default',
};

/** Literal keys per status — the localization gate greps for `t('…')`. */
export const statusLabels = (t: Translator['t']): Record<GiftCardDisplayStatus, string> => ({
  ACTIVE: t('finance.giftCards.statusActive'),
  REDEEMED: t('finance.giftCards.statusRedeemed'),
  EXPIRED: t('finance.giftCards.statusExpired'),
});

/** EXPIRED is a read-time fact, not a stored enum — the filter only offers the
 * two values the server can match against the stored column. */
export const statusOptions = (t: Translator['t']) => [
  { value: 'ACTIVE', label: t('finance.giftCards.statusActive') },
  { value: 'REDEEMED', label: t('finance.giftCards.statusRedeemed') },
];
