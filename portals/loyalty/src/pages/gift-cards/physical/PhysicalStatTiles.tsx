import { Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { SvgIconComponent } from '@mui/icons-material';
import BlockIcon from '@mui/icons-material/Block';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import RedeemIcon from '@mui/icons-material/Redeem';
import SavingsIcon from '@mui/icons-material/Savings';
import { StatCard } from '@duncit/ui';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { formatCoins } from './labels';
import type { PhysicalStats } from './queries';

type TileKey = 'generated' | 'redeemed' | 'outstanding' | 'expired' | 'voided' | 'mapped' | 'batches';

interface Tile {
  key: TileKey;
  icon: SvgIconComponent;
  /** A palette key, so the tile follows the theme rather than a hard-coded colour. */
  color: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  /** The headline number, and the line under it. */
  value: (s: PhysicalStats) => number;
  hint?: (s: PhysicalStats, t: Translator['t']) => string;
}

const cards = (t: Translator['t'], n: number) => t('loyalty.physical.tileCardsHint', { vars: { n: formatCoins(n) } });

const TILES: readonly Tile[] = [
  { key: 'generated', icon: ConfirmationNumberIcon, color: 'primary', value: (s) => s.generated_coins, hint: (s, t) => cards(t, s.generated_count) },
  { key: 'redeemed', icon: RedeemIcon, color: 'success', value: (s) => s.redeemed_coins, hint: (s, t) => cards(t, s.redeemed_count) },
  { key: 'outstanding', icon: SavingsIcon, color: 'warning', value: (s) => s.outstanding_coins, hint: (s, t) => cards(t, s.outstanding_count) },
  { key: 'expired', icon: EventBusyIcon, color: 'secondary', value: (s) => s.expired_coins, hint: (s, t) => cards(t, s.expired_count) },
  { key: 'voided', icon: BlockIcon, color: 'error', value: (s) => s.voided_coins, hint: (s, t) => cards(t, s.voided_count) },
  { key: 'mapped', icon: PersonPinIcon, color: 'info', value: (s) => s.mapped_count },
  { key: 'batches', icon: Inventory2Icon, color: 'primary', value: (s) => s.batch_count },
];

/** Literal keys per tile — the localization gate greps for `t('…')`. */
const tileLabels = (t: Translator['t']): Record<TileKey, string> => ({
  generated: t('loyalty.physical.tileGenerated'),
  redeemed: t('loyalty.physical.tileRedeemed'),
  outstanding: t('loyalty.physical.tileOutstanding'),
  expired: t('loyalty.physical.tileExpired'),
  voided: t('loyalty.physical.tileVoided'),
  mapped: t('loyalty.physical.tileMapped'),
  batches: t('loyalty.physical.tileBatches'),
});

/** Where every printed coin is: redeemed, still owed, lapsed or cancelled. */
export default function PhysicalStatTiles({ stats, loading }: Readonly<{ stats?: PhysicalStats; loading: boolean }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const labels = tileLabels(t);
  return (
    <Grid container spacing={2}>
      {TILES.map((tile) => {
        const Icon = tile.icon;
        return (
          <Grid key={tile.key} size={{ xs: 6, sm: 4, md: 3, lg: 'grow' }}>
            <StatCard
              layout="split"
              label={labels[tile.key]}
              value={stats ? formatCoins(tile.value(stats)) : '—'}
              hint={stats && tile.hint ? tile.hint(stats, t) : undefined}
              valueVariant="h5"
              loading={loading && !stats}
              icon={<Icon fontSize="small" />}
              iconBox={{ color: theme.palette[tile.color].main, alpha: 0.1, size: 40, radius: 1.5 }}
              cardVariant="elevation"
              sx={{ height: '100%' }}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}

