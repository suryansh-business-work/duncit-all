import { Grid } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import {
  GIFT_CARD_TILES,
  type GiftCardAdminStats,
  type GiftCardTile,
  type GiftCardTileKey,
} from './queries';

interface Props {
  stats: GiftCardAdminStats | null | undefined;
  loading: boolean;
}

/** Literal keys per tile — the localization gate greps for `t('…')`, so the
 * keys must not be composed from the tile key at render time. */
const tileLabels = (t: Translator['t']): Record<GiftCardTileKey, string> => ({
  sold_count: t('finance.giftCards.tileSold'),
  sold_value: t('finance.giftCards.tileSoldValue'),
  redeemed_value: t('finance.giftCards.tileRedeemedValue'),
  outstanding_value: t('finance.giftCards.tileOutstanding'),
  expired_value: t('finance.giftCards.tileExpired'),
  validity_months: t('finance.giftCards.tileValidity'),
});

/** A money tile carries the admin-configured symbol; the count tile is bare. */
function tileValue(tile: GiftCardTile, stats: GiftCardAdminStats): string {
  const raw = stats[tile.key];
  if (tile.money) return formatMoney(raw, { symbol: stats.currency_symbol });
  return formatMoney(raw, { symbol: '' });
}

export default function GiftCardStatTiles({ stats, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = tileLabels(t);
  return (
    <Grid container spacing={2}>
      {GIFT_CARD_TILES.map((tile) => {
        const Icon = tile.icon;
        // Only the validity tile carries a hint — the tenure a number of
        // months means, spelled out under the bare count.
        const hint =
          stats && tile.key === 'validity_months'
            ? t('finance.giftCards.validityMonths', { vars: { n: stats.validity_months } })
            : undefined;
        return (
          // Six tiles at two columns each = one clean desktop row.
          <Grid item xs={6} sm={4} md={2} key={tile.key}>
            <StatCard
              layout="split"
              label={labels[tile.key]}
              value={stats ? tileValue(tile, stats) : '—'}
              hint={hint}
              valueVariant="h5"
              loading={loading && !stats}
              icon={<Icon fontSize="small" />}
              iconBox={{ color: tile.color, alpha: 0.1, size: 40, radius: 1.5 }}
              cardVariant="elevation"
              sx={{ height: '100%' }}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}
