import type { SvgIconComponent } from '@mui/icons-material';
import SosRoundedIcon from '@mui/icons-material/SosRounded';
import PhoneCallbackRoundedIcon from '@mui/icons-material/PhoneCallbackRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';

/** The tile's icon tone: the brand accent, or danger for the emergency entry. */
export type SupportTone = 'accent' | 'danger';

export interface SupportSection {
  key: string;
  path: string;
  label: string;
  Icon: SvgIconComponent;
  tone: SupportTone;
  podScoped: boolean;
  /** Localization key, preferred over the literal above when present. */
  labelKey?: string;
}

// Navigation configuration for the Support hub landing grid. Each entry maps to
// a nested route under /support and renders as a tappable tile.
export const SUPPORT_SECTIONS: SupportSection[] = [
  {
    key: 'sos',
    path: '/support/sos',
    label: 'SOS',
    Icon: SosRoundedIcon,
    tone: 'danger',
    podScoped: true,
  },
  {
    key: 'callback',
    path: '/support/callback',
    label: 'Callback Request',
    labelKey: 'mweb.common.callbackRequest',
    Icon: PhoneCallbackRoundedIcon,
    tone: 'accent',
    podScoped: true,
  },
  {
    key: 'tickets',
    path: '/support/tickets',
    label: 'Create Support Tickets',
    labelKey: 'mweb.common.createSupportTickets',
    Icon: ConfirmationNumberOutlinedIcon,
    tone: 'accent',
    podScoped: false,
  },
  {
    key: 'live',
    path: '/support/live',
    label: 'Chat with Us',
    labelKey: 'mweb.common.chatWithUs',
    Icon: SensorsRoundedIcon,
    tone: 'accent',
    podScoped: false,
  },
  {
    key: 'all',
    path: '/support/all',
    label: 'All Support Tickets',
    labelKey: 'mweb.common.allSupportTickets',
    Icon: HistoryRoundedIcon,
    tone: 'accent',
    podScoped: false,
  },
  {
    key: 'grievance',
    path: '/support/grievance',
    label: 'Raise a Grievance',
    labelKey: 'grievance.title',
    Icon: GavelRoundedIcon,
    tone: 'accent',
    podScoped: false,
  },
  {
    key: 'feedback',
    path: '/support/feedback',
    label: 'Report a Problem',
    labelKey: 'mweb.common.reportAProblem',
    Icon: FeedbackOutlinedIcon,
    tone: 'accent',
    podScoped: false,
  },
];
