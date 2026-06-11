import type { SvgIconComponent } from '@mui/icons-material';
import SosIcon from '@mui/icons-material/Sos';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import HistoryIcon from '@mui/icons-material/History';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SensorsIcon from '@mui/icons-material/Sensors';

export interface SupportSection {
  key: string;
  path: string;
  label: string;
  description: string;
  Icon: SvgIconComponent;
  color: string;
  podScoped: boolean;
}

// Navigation configuration for the Support hub landing grid. Each entry maps to
// a nested route under /support and renders as a tappable card.
export const SUPPORT_SECTIONS: SupportSection[] = [
  {
    key: 'sos',
    path: '/support/sos',
    label: 'SOS',
    description: 'Emergency help at your live pod',
    Icon: SosIcon,
    color: '#f44336',
    podScoped: true,
  },
  {
    key: 'callback',
    path: '/support/callback',
    label: 'Callback Request',
    description: 'Call us or get a callback',
    Icon: PhoneCallbackIcon,
    color: '#2196f3',
    podScoped: true,
  },
  {
    key: 'tickets',
    path: '/support/tickets',
    label: 'Create Support Tickets',
    description: 'Raise an issue with our team',
    Icon: ConfirmationNumberIcon,
    color: '#ff4f73',
    podScoped: false,
  },
  {
    key: 'live',
    path: '/support/live',
    label: 'Chat with Us',
    description: 'Real-time chat with our support team',
    Icon: SensorsIcon,
    color: '#4caf50',
    podScoped: false,
  },
  {
    key: 'all',
    path: '/support/all',
    label: 'All Support Tickets',
    description: 'Every request you have raised, in one list',
    Icon: HistoryIcon,
    color: '#7c5cff',
    podScoped: false,
  },
];
