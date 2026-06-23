import { gql, useQuery } from '@apollo/client';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Divider, List, ListItemButton, ListItemIcon, ListItemText, Skeleton, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faCircleQuestion, faFileLines, faGaugeHigh, faHeadset, faStore, faUserTie } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useBranding } from '../lib/useBranding';
import { HEADER_HEIGHT } from './PartnerShell';

interface NavItem {
  label: string;
  to: string;
  icon: IconDefinition;
  match: string;
}

interface Props {
  onCloseMobile?: () => void;
}

const sections: { heading: string; items: NavItem[] }[] = [
  { heading: 'Dashboard', items: [{ label: 'Dashboard', to: '/', icon: faGaugeHigh, match: '/' }] },
  {
    heading: 'Partner Tools',
    items: [
      { label: 'Venues', to: '/register-venue', icon: faBuilding, match: '/register-venue' },
      { label: 'Host', to: '/become-host', icon: faUserTie, match: '/become-host' },
      { label: 'E-Commerce Brand', to: '/ecomm-brand', icon: faStore, match: '/ecomm-brand' },
    ],
  },
  { heading: 'Help', items: [{ label: 'FAQs', to: '/faqs', icon: faCircleQuestion, match: '/faqs' }, { label: 'Support', to: '/support', icon: faHeadset, match: '/support' }] },
];

const PUBLIC_POLICIES = gql`
  query PartnerSidebarPolicies {
    publicPolicies { id slug title }
  }
`;

export default function PartnerSidebar({ onCloseMobile }: Readonly<Props>) {
  const location = useLocation();
  const { data } = useQuery(PUBLIC_POLICIES, { fetchPolicy: 'cache-first' });
  const { logoUrl, appName, loading } = useBranding();
  const policies = data?.publicPolicies ?? [];

  const isActive = (item: NavItem) => (item.match === '/' ? location.pathname === '/' : location.pathname.startsWith(item.match));

  return (
    <Box component="aside" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      <Box component={RouterLink} to="/" onClick={onCloseMobile} sx={{ minHeight: HEADER_HEIGHT, px: 2, display: 'flex', alignItems: 'center', gap: 1.25, color: 'inherit', textDecoration: 'none', borderBottom: 1, borderColor: 'divider' }}>
        {loading ? (
          <Skeleton variant="rounded" width={96} height={24} />
        ) : (
          <Box component="img" src={logoUrl} alt={appName} sx={{ height: 26, width: 'auto', maxWidth: 130, objectFit: 'contain' }} />
        )}
        <Typography variant="caption" color="primary" fontWeight={800} sx={{ letterSpacing: 0.3 }} noWrap>Partners</Typography>
      </Box>
      <Divider />
      <List sx={{ py: 1, flex: 1, overflowY: 'auto' }}>
        {sections.map((section) => (
          <Box key={section.heading} sx={{ mb: 1 }}>
            <Typography variant="overline" sx={{ px: 2.5, color: 'text.secondary', fontWeight: 700, letterSpacing: 0.4, display: 'block', mt: 1 }}>
              {section.heading}
            </Typography>
            {section.items.map((item) => <PartnerNavItem key={item.to} item={item} active={isActive(item)} onClick={onCloseMobile} />)}
          </Box>
        ))}
        {policies.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="overline" sx={{ px: 2.5, color: 'text.secondary', fontWeight: 700, letterSpacing: 0.4, display: 'block', mt: 1 }}>Policies</Typography>
              {policies.map((policy: any) => {
                const active = location.pathname === `/policies/${policy.slug}`;
                return (
                  <PartnerNavItem key={policy.id} item={{ label: policy.title, to: `/policies/${policy.slug}`, icon: faFileLines, match: `/policies/${policy.slug}` }} active={active} onClick={onCloseMobile} />
                );
              })}
          </Box>
        )}
      </List>
    </Box>
  );
}

function PartnerNavItem({ item, active, onClick }: Readonly<{ item: NavItem; active: boolean; onClick?: () => void }>) {
  return (
    <ListItemButton component={RouterLink} to={item.to} onClick={onClick} sx={{ borderRadius: 1, mx: 1, my: 0.25, color: active ? 'primary.main' : 'text.secondary', bgcolor: active ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}>
      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><FontAwesomeIcon icon={item.icon} fixedWidth /></ListItemIcon>
      <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 800 : 600, fontSize: 14, noWrap: true }} />
    </ListItemButton>
  );
}