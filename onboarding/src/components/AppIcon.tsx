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
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WidgetsIcon from '@mui/icons-material/Widgets';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';

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
  people: PeopleIcon,
  storefront: StorefrontIcon,
  survey: AssignmentIcon,
  calendar: EventIcon,
};

/** Resolves a config icon name to an MUI icon, falling back to a neutral glyph. */
export default function AppIcon({ name, ...props }: { name: string } & SvgIconProps) {
  const Icon = ICONS[name] ?? WidgetsIcon;
  return <Icon {...props} />;
}
