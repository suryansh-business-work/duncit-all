import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CalculateIcon from '@mui/icons-material/Calculate';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CampaignIcon from '@mui/icons-material/Campaign';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ConstructionIcon from '@mui/icons-material/Construction';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ContactsIcon from '@mui/icons-material/Contacts';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import DnsIcon from '@mui/icons-material/Dns';
import EmailIcon from '@mui/icons-material/Email';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FlagIcon from '@mui/icons-material/Flag';
import ForumIcon from '@mui/icons-material/Forum';
import GavelIcon from '@mui/icons-material/Gavel';
import GroupsIcon from '@mui/icons-material/Groups';
import HandymanIcon from '@mui/icons-material/Handyman';
import HelpIcon from '@mui/icons-material/Help';
import HubIcon from '@mui/icons-material/Hub';
import ImageIcon from '@mui/icons-material/Image';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InsightsIcon from '@mui/icons-material/Insights';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LockIcon from '@mui/icons-material/Lock';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleIcon from '@mui/icons-material/People';
import PercentIcon from '@mui/icons-material/Percent';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SettingsIcon from '@mui/icons-material/Settings';
import ShieldIcon from '@mui/icons-material/Shield';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StarRateIcon from '@mui/icons-material/StarRate';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TimelineIcon from '@mui/icons-material/Timeline';
import TuneIcon from '@mui/icons-material/Tune';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import WidgetsIcon from '@mui/icons-material/Widgets';
import WorkIcon from '@mui/icons-material/Work';

/** Union of every per-portal AppIcon map so one component serves all consoles. */
const ICONS: Record<string, ComponentType<SvgIconProps>> = {
  accountTree: AccountTreeIcon,
  ai: SmartToyIcon,
  analytics: AnalyticsIcon,
  article: ArticleIcon,
  calculator: CalculateIcon,
  calendar: CalendarMonthIcon,
  callback: PhoneCallbackIcon,
  campaign: CampaignIcon,
  challenge: EmojiEventsIcon,
  chat: ForumIcon,
  community: GroupsIcon,
  construction: ConstructionIcon,
  contactMail: ContactMailIcon,
  contacts: ContactsIcon,
  customers: GroupsIcon,
  dashboard: DashboardIcon,
  description: DescriptionIcon,
  dns: DnsIcon,
  docker: ViewInArIcon,
  document: DescriptionIcon,
  email: EmailIcon,
  expenses: RequestQuoteIcon,
  feedback: StarRateIcon,
  flag: FlagIcon,
  forum: ForumIcon,
  groups: GroupsIcon,
  help: HelpIcon,
  'host-request': AssignmentIndIcon,
  hub: HubIcon,
  image: ImageIcon,
  info: InfoOutlinedIcon,
  insights: InsightsIcon,
  inventory: Inventory2Icon,
  local_shipping: LocalShippingIcon,
  location: MyLocationIcon,
  lock: LockIcon,
  marketing: CampaignIcon,
  marketplace: StorefrontIcon,
  menuBook: MenuBookIcon,
  newspaper: NewspaperIcon,
  northstar: InsightsIcon,
  notifications: NotificationsIcon,
  operations: LocalShippingIcon,
  orders: ReceiptLongIcon,
  payments: PaymentsIcon,
  people: PeopleIcon,
  percent: PercentIcon,
  personSearch: PersonSearchIcon,
  phone: PhoneInTalkIcon,
  policy: GavelIcon,
  product: AnalyticsIcon,
  profit: InsightsIcon,
  quote: RequestQuoteIcon,
  receipt: ReceiptLongIcon,
  revenue: PaymentsIcon,
  sales: TimelineIcon,
  settings: SettingsIcon,
  shield: ShieldIcon,
  shipping: LocalShippingIcon,
  sos: WarningAmberIcon,
  storefront: StorefrontIcon,
  support: SupportAgentIcon,
  survey: AssignmentIcon,
  ticket: ConfirmationNumberIcon,
  timeline: TimelineIcon,
  tools: HandymanIcon,
  tune: TuneIcon,
  'user-search': PersonSearchIcon,
  whatsapp: WhatsAppIcon,
  work: WorkIcon,
};

type AppIconProps = { name?: string } & SvgIconProps;

/** Resolves a config icon name to an MUI icon, falling back to a neutral glyph. */
export function AppIcon({ name, ...props }: Readonly<AppIconProps>) {
  const Icon = (name && ICONS[name]) || WidgetsIcon;
  return <Icon {...props} />;
}
