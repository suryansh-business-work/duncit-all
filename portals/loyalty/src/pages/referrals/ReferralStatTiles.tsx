import { useTheme } from '@mui/material/styles';
import type { SvgIconComponent } from '@mui/icons-material';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PaymentsIcon from '@mui/icons-material/Payments';
import PercentIcon from '@mui/icons-material/Percent';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { EM_DASH } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import StatTileGrid, { type StatTile } from '../../components/StatTileGrid';
import { coinCount } from '../duncit-coin/queries';
import type { ReferralAdminStats } from './queries';

const HISTORY = '/referrals/history';

/** The referral programme's headline numbers: codes, signups, who paid, what it cost, and payouts that did not land. */
export default function ReferralStatTiles({ stats, loading }: Readonly<{ stats?: ReferralAdminStats; loading: boolean }>) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const count = (value?: number) => (stats && value != null ? coinCount(value) : EM_DASH);
  const incomplete = (stats?.payouts_partial ?? 0) + (stats?.payouts_unpaid ?? 0);
  const waiting = loading && !stats;

  // label, value, hint, icon, colour, destination — one row per tile.
  const rows: Array<[string, string, string, string, SvgIconComponent, string, string]> = [
    ['codes', t('loyalty.referrals.tileCodes'), count(stats?.codes_issued), t('loyalty.referrals.tileCodesHint', { vars: { n: count(stats?.active_referrers) } }), CampaignIcon, palette.primary.main, HISTORY],
    ['idle', t('loyalty.referrals.tileIdle'), count(stats?.idle_codes), t('loyalty.referrals.tileIdleHint'), PersonSearchIcon, palette.grey[600], HISTORY],
    ['joined', t('loyalty.referrals.tileJoined'), count(stats?.total_referrals), t('loyalty.referrals.tileJoinedHint'), GroupAddIcon, palette.info.main, HISTORY],
    ['converted', t('loyalty.referrals.tileConverted'), count(stats?.converted), t('loyalty.referrals.tileConvertedHint'), PaymentsIcon, palette.success.main, HISTORY],
    ['awaiting', t('loyalty.referrals.tileAwaiting'), count(stats?.awaiting_first_payment), t('loyalty.referrals.tileAwaitingHint'), HourglassEmptyIcon, palette.warning.main, HISTORY],
    ['conversion', t('loyalty.referrals.tileConversion'), stats ? `${stats.conversion_pct}%` : EM_DASH, t('loyalty.referrals.tileConversionHint'), PercentIcon, palette.secondary.main, HISTORY],
    ['coins', t('loyalty.referrals.tileCoins'), count(stats?.coins_paid), t('loyalty.referrals.tileCoinsHint', { vars: { referrer: count(stats?.referrer_coins), member: count(stats?.new_member_coins) } }), MonetizationOnIcon, palette.primary.dark, '/duncit-coin/transactions'],
    ['incomplete', t('loyalty.referrals.tileIncomplete'), stats ? coinCount(incomplete) : EM_DASH, t('loyalty.referrals.tileIncompleteHint'), ReportProblemIcon, palette.error.main, HISTORY],
  ];
  const tiles: StatTile[] = rows.map(([key, label, value, hint, icon, color, to]) => ({
    key,
    label,
    value,
    hint,
    icon,
    color,
    to,
    loading: waiting,
  }));

  return <StatTileGrid tiles={tiles} testIdPrefix="referral-tile" />;
}
