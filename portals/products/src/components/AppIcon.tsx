import type { SvgIconProps } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RuleIcon from '@mui/icons-material/Rule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PaymentsIcon from '@mui/icons-material/Payments';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WidgetsIcon from '@mui/icons-material/Widgets';

const ICONS: Record<string, React.ComponentType<SvgIconProps>> = {
  settings: SettingsIcon,
  tune: TuneIcon,
  dashboard: DashboardIcon,
  forum: ForumIcon,
  inventory: Inventory2Icon,
  storefront: StorefrontIcon,
  local_shipping: LocalShippingIcon,
  rule: RuleIcon,
  warning: WarningAmberIcon,
  payments: PaymentsIcon,
  trending_up: TrendingUpIcon,
};

/** Resolves a config icon name to an MUI icon, falling back to a neutral glyph. */
export default function AppIcon({ name, ...props }: { name: string } & SvgIconProps) {
  const Icon = ICONS[name] ?? WidgetsIcon;
  return <Icon {...props} />;
}
