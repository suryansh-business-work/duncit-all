import type { SvgIconComponent } from '@mui/icons-material';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import AddCircleOutlineOutlined from '@mui/icons-material/AddCircleOutlineOutlined';
import AssignmentReturnOutlined from '@mui/icons-material/AssignmentReturnOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import LocalMallOutlined from '@mui/icons-material/LocalMallOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import TravelExploreOutlined from '@mui/icons-material/TravelExploreOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import WarehouseOutlined from '@mui/icons-material/WarehouseOutlined';
import type { StudioOptionIcon } from '@duncit/utils';

/** The console's glyph for each option the shared catalogue names by meaning. */
export const STUDIO_OPTION_ICONS: Readonly<Record<StudioOptionIcon, SvgIconComponent>> = {
  dashboard: DashboardOutlined,
  venue: StorefrontOutlined,
  pods: EventOutlined,
  create: AddCircleOutlineOutlined,
  autopods: AutoAwesomeOutlined,
  calendar: CalendarMonthOutlined,
  availability: EventAvailableOutlined,
  settings: SettingsOutlined,
  earnings: PaymentsOutlined,
  publish: PublicOutlined,
  change: SwapHorizOutlined,
  requests: InboxOutlined,
  nearby: TravelExploreOutlined,
  verification: VerifiedUserOutlined,
  wallet: AccountBalanceWalletOutlined,
  clubs: GroupsOutlined,
  monitoring: InsightsOutlined,
  brands: LocalMallOutlined,
  integrations: HubOutlined,
  returns: AssignmentReturnOutlined,
  orders: ReceiptLongOutlined,
  warehouses: WarehouseOutlined,
};
