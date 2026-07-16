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
import { formatAdCost } from '../ads/ad-options';
import type { AdsDashboardStats } from './queries';

type CountKey = 'total' | 'pending' | 'approved' | 'live' | 'rejected' | 'expired';
type MoneyKey = 'total_approved_cost' | 'live_spend';

interface StatConfig {
  key: CountKey | MoneyKey;
  label: string;
  icon: ReactNode;
  /** Formats the value with the dashboard currency symbol. */
  money?: boolean;
  /** Theme color path for the icon; default 'primary.main'. */
  iconColor?: string;
  /** Theme color path for the value text (e.g. Live cards get the success tone). */
  valueColor?: string;
}

const STATS: ReadonlyArray<StatConfig> = [
  { key: 'total', label: 'Total Ads', icon: <CampaignOutlinedIcon fontSize="small" /> },
  {
    key: 'pending',
    label: 'Pending Review',
    icon: <HourglassTopOutlinedIcon fontSize="small" />,
    iconColor: 'warning.main',
  },
  {
    key: 'live',
    label: 'Live Now',
    icon: <SensorsOutlinedIcon fontSize="small" />,
    iconColor: 'success.main',
    valueColor: 'success.main',
  },
  {
    key: 'approved',
    label: 'Upcoming Approved',
    icon: <EventAvailableOutlinedIcon fontSize="small" />,
    iconColor: 'info.main',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    icon: <CancelOutlinedIcon fontSize="small" />,
    iconColor: 'error.main',
  },
  {
    key: 'expired',
    label: 'Expired',
    icon: <EventBusyOutlinedIcon fontSize="small" />,
    iconColor: 'text.disabled',
  },
  {
    key: 'total_approved_cost',
    label: 'Total Approved Spend',
    icon: <PaymentsOutlinedIcon fontSize="small" />,
    money: true,
  },
  {
    key: 'live_spend',
    label: 'Live Spend',
    icon: <TrendingUpOutlinedIcon fontSize="small" />,
    iconColor: 'success.main',
    valueColor: 'success.main',
    money: true,
  },
];

/** The KPI tile grid — one StatCard per dashboard bucket / spend figure. */
export default function StatGrid({ stats }: Readonly<{ stats: AdsDashboardStats }>) {
  return (
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2}>
      {STATS.map((card) => {
        const raw = stats[card.key];
        const value = card.money ? formatAdCost(raw, stats.currency_symbol) : raw;
        return (
          <StatCard
            key={card.key}
            label={card.label}
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
