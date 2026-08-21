import type { SvgIconComponent } from '@mui/icons-material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChatIcon from '@mui/icons-material/Chat';
import EventIcon from '@mui/icons-material/Event';
import MarkunreadMailboxIcon from '@mui/icons-material/MarkunreadMailbox';
import MicIcon from '@mui/icons-material/Mic';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PaymentIcon from '@mui/icons-material/Payment';
import PersonIcon from '@mui/icons-material/Person';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import StarIcon from '@mui/icons-material/Star';
import { notificationCategory, type NotificationCategory } from '@duncit/utils';

/** The classification itself is shared with the native app (@duncit/utils); only
 * the icon map below is MUI-specific and therefore stays here. */
export { notificationCategory, type NotificationCategory };

/** MUI icon component per category. */
const ICON_BY_CATEGORY: Record<NotificationCategory, SvgIconComponent> = {
  review: StarIcon,
  meeting: EventIcon,
  approval: CheckCircleIcon,
  request: MarkunreadMailboxIcon,
  achievement: CelebrationIcon,
  support: ChatIcon,
  payment: PaymentIcon,
  club: AccountBalanceIcon,
  pod: MicIcon,
  post: PhotoLibraryIcon,
  account: PersonIcon,
  general: NotificationsActiveIcon,
};

/** Contextual MUI icon component for a notification's title. */
export function notificationIcon(title: string | null | undefined): SvgIconComponent {
  return ICON_BY_CATEGORY[notificationCategory(title)];
}
