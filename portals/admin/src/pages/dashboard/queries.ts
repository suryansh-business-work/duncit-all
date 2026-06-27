import { gql } from '@apollo/client';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GroupsIcon from '@mui/icons-material/Groups';
import StorefrontIcon from '@mui/icons-material/Storefront';
import BadgeIcon from '@mui/icons-material/Badge';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import type { SvgIconComponent } from '@mui/icons-material';

export const SUPER_CATS = gql`
  query DashboardSuperCats {
    categories(filter: { level: SUPER }) {
      id
      name
      slug
    }
  }
`;

export const TOTALS = gql`
  query DashboardTotals($slug: String) {
    dashboardTotals(super_category_slug: $slug) {
      pods {
        super_category_slug
        super_category_name
        count
      }
      clubs {
        super_category_slug
        super_category_name
        count
      }
      users_total
      pods_total
      clubs_total
      venues_total
      hosts_total
      support_tickets_open
      support_tickets_total
    }
  }
`;

export type SummaryTileKey =
  | 'users_total'
  | 'pods_total'
  | 'clubs_total'
  | 'venues_total'
  | 'hosts_total'
  | 'support_tickets_open';

export const SUMMARY_TILES: Array<{
  key: SummaryTileKey;
  label: string;
  icon: SvgIconComponent;
  color: string;
  to?: string;
}> = [
  { key: 'users_total', label: 'Users', icon: PeopleAltIcon, color: '#2563eb', to: '/users' },
  { key: 'pods_total', label: 'Pods', icon: EventAvailableIcon, color: '#7c3aed', to: '/pods' },
  { key: 'clubs_total', label: 'Clubs', icon: GroupsIcon, color: '#0f766e', to: '/clubs' },
  { key: 'venues_total', label: 'Venues', icon: StorefrontIcon, color: '#d97706' },
  { key: 'hosts_total', label: 'Hosts', icon: BadgeIcon, color: '#dc2626' },
  {
    key: 'support_tickets_open',
    label: 'Support Tickets',
    icon: SupportAgentIcon,
    color: '#0891b2',
    to: '/support-logs',
  },
];
