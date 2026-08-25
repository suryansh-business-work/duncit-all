import type { ReactNode } from 'react';
import { Stack } from '@mui/material';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { formatAdCost } from '../ads/ad-options';
import type { AdsDashboardStats } from './queries';

type CountKey = 'total' | 'pending' | 'approved' | 'live' | 'rejected' | 'expired';
type MoneyKey = 'total_approved_cost' | 'live_spend';

interface StatConfig {
  key: CountKey | MoneyKey;
  /** Written out as a literal: the build gate greps for literal key strings. */
  labelKey: string;
  icon: ReactNode;
  /** Formats the value with the dashboard currency symbol. */
  money?: boolean;
  /** Theme color path for the icon; default 'primary.main'. */
  iconColor?: string;
  /** Theme color path for the value text (e.g. Live cards get the success tone). */
  valueColor?: string;
}

const STATS: ReadonlyArray<StatConfig> = [
  { key: 'total', labelKey: 'ads.stats.total', icon: <CampaignOutlinedIcon fontSize="small" /> },
  {
    key: 'pending',
    labelKey: 'ads.stats.pending',
    icon: <HourglassTopOutlinedIcon fontSize="small" />,
    iconColor: 'warning.main',
  },
  {
    key: 'live',
    labelKey: 'ads.stats.live',
    icon: <SensorsOutlinedIcon fontSize="small" />,
    iconColor: 'success.main',
    valueColor: 'success.main',
  },
  {
    key: 'approved',
    labelKey: 'ads.stats.approved',
    icon: <EventAvailableOutlinedIcon fontSize="small" />,
    iconColor: 'info.main',
  },
  {
    key: 'rejected',
    labelKey: 'ads.stats.rejected',
    icon: <CancelOutlinedIcon fontSize="small" />,
    iconColor: 'error.main',
  },
  {
    key: 'expired',
    labelKey: 'ads.stats.expired',
    icon: <EventBusyOutlinedIcon fontSize="small" />,
    iconColor: 'text.disabled',
  },
  {
    key: 'total_approved_cost',
    labelKey: 'ads.stats.totalApprovedCost',
    icon: <PaymentsOutlinedIcon fontSize="small" />,
    money: true,
  },
  {
    key: 'live_spend',
    labelKey: 'ads.stats.liveSpend',
    icon: <TrendingUpOutlinedIcon fontSize="small" />,
    iconColor: 'success.main',
    valueColor: 'success.main',
    money: true,
  },
];

/** The KPI tile grid — one StatCard per dashboard bucket / spend figure. */
export default function StatGrid({ stats }: Readonly<{ stats: AdsDashboardStats }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" useFlexGap spacing={2} sx={{
      flexWrap: "wrap"
    }}>
      {STATS.map((card) => {
        const raw = stats[card.key];
        const value = card.money ? formatAdCost(raw, stats.currency_symbol) : raw;
        return (
          <StatCard
            key={card.key}
            label={t(card.labelKey)}
            value={value}
            icon={card.icon}
            iconColor={card.iconColor ?? 'primary.main'}
            valueColor={card.valueColor}
            sx={{ borderRadius: 3, flex: '1 1 200px', minWidth: 200 }}
          />
        );
      })}
    </Stack>
  );
}
