import type { SvgIconProps } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CampaignIcon from '@mui/icons-material/Campaign';
import ImageIcon from '@mui/icons-material/Image';
import InsightsIcon from '@mui/icons-material/Insights';
import GroupsIcon from '@mui/icons-material/Groups';
import ContactsIcon from '@mui/icons-material/Contacts';
import TimelineIcon from '@mui/icons-material/Timeline';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CalculateIcon from '@mui/icons-material/Calculate';
import SettingsIcon from '@mui/icons-material/Settings';
import PaymentsIcon from '@mui/icons-material/Payments';
import PercentIcon from '@mui/icons-material/Percent';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import DescriptionIcon from '@mui/icons-material/Description';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShieldIcon from '@mui/icons-material/Shield';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WidgetsIcon from '@mui/icons-material/Widgets';

const ICONS: Record<string, React.ComponentType<SvgIconProps>> = {
  dashboard: DashboardIcon,
  campaign: CampaignIcon,
  image: ImageIcon,
  insights: InsightsIcon,
  groups: GroupsIcon,
  contacts: ContactsIcon,
  timeline: TimelineIcon,
  support: SupportAgentIcon,
  shipping: LocalShippingIcon,
  orders: ReceiptLongIcon,
  location: MyLocationIcon,
  analytics: AnalyticsIcon,
  calculator: CalculateIcon,
  settings: SettingsIcon,
  receipt: ReceiptLongIcon,
  payments: PaymentsIcon,
  percent: PercentIcon,
  quote: RequestQuoteIcon,
  description: DescriptionIcon,
  menuBook: MenuBookIcon,
  storefront: StorefrontIcon,
  shield: ShieldIcon,
  calendar: CalendarMonthIcon,
  // Founder dashboard category icons
  revenue: PaymentsIcon,
  profit: InsightsIcon,
  expenses: RequestQuoteIcon,
  customers: GroupsIcon,
  sales: TimelineIcon,
  marketing: CampaignIcon,
  product: AnalyticsIcon,
  operations: LocalShippingIcon,
  marketplace: StorefrontIcon,
  community: GroupsIcon,
  northstar: InsightsIcon,
};

/** Resolves a config icon name to an MUI icon, falling back to a neutral glyph. */
export default function AppIcon({ name, ...props }: { name: string } & SvgIconProps) {
  const Icon = ICONS[name] ?? WidgetsIcon;
  return <Icon {...props} />;
}
