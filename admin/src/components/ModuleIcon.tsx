import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import CategoryIcon from '@mui/icons-material/Category';
import GroupsIcon from '@mui/icons-material/Groups';
import CampaignIcon from '@mui/icons-material/Campaign';
import LanguageIcon from '@mui/icons-material/Language';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TuneIcon from '@mui/icons-material/Tune';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import type { SvgIconComponent } from '@mui/icons-material';

export type ModuleIconKind =
  | 'dashboard'
  | 'users'
  | 'catalog'
  | 'campaign'
  | 'community'
  | 'engagement'
  | 'website'
  | 'finance'
  | 'inventory'
  | 'system';

interface Props {
  kind: ModuleIconKind;
  color: string;
}

const ICONS: Record<ModuleIconKind, SvgIconComponent> = {
  dashboard: DashboardIcon,
  users: ManageAccountsIcon,
  catalog: CategoryIcon,
  campaign: CampaignIcon,
  community: GroupsIcon,
  engagement: CampaignIcon,
  website: LanguageIcon,
  finance: AccountBalanceWalletIcon,
  inventory: Inventory2Icon,
  system: TuneIcon,
};

export default function ModuleIcon({ kind, color }: Props) {
  const theme = useTheme();
  const Icon = ICONS[kind];

  return (
    <Box
      sx={{
        position: 'relative',
        width: 76,
        height: 76,
        display: 'grid',
        placeItems: 'center',
        '@keyframes moduleIconFloat': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        '@keyframes moduleSignal': {
          '0%, 100%': { opacity: 0.45, transform: 'scaleX(0.72)' },
          '50%': { opacity: 0.95, transform: 'scaleX(1)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha(color, 0.18)}, ${alpha(color, 0.06)})`,
          border: `1px solid ${alpha(color, theme.palette.mode === 'dark' ? 0.28 : 0.18)}`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 42,
          height: 5,
          bottom: 12,
          borderRadius: 999,
          bgcolor: alpha(color, 0.16),
          animation: 'moduleSignal 2.8s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.22 : 0.12),
          color,
          position: 'relative',
          animation: 'moduleIconFloat 3.2s ease-in-out infinite',
        }}
      >
        <Icon sx={{ fontSize: 28 }} />
      </Box>
    </Box>
  );
}
