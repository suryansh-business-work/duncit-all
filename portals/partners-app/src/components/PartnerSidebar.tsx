import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import { Box, Collapse, Divider, List, ListItemButton, ListItemIcon, ListItemText, Skeleton, Typography } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faCalendarCheck, faChartLine, faCircleQuestion, faFileLines, faGaugeHigh, faHeadset, faStore, faUsersGear, faUserTie } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useBranding } from '../lib/useBranding';
import { HEADER_HEIGHT } from './PartnerShell';

interface NavItem {
  label: string;
  to: string;
  icon: IconDefinition;
  match: string;
  children?: NavItem[];
}

interface Props {
  onCloseMobile?: () => void;
}

const sections: { heading: string; items: NavItem[] }[] = [
  { heading: 'Dashboard', items: [{ label: 'Dashboard', to: '/', icon: faGaugeHigh, match: '/' }] },
  {
    heading: 'Partner Tools',
    items: [
      {
        label: 'Venues',
        to: '/venues/dashboard',
        icon: faBuilding,
        match: '/venues-group',
        children: [
          { label: 'Venue Dashboard', to: '/venues/dashboard', icon: faChartLine, match: '/venues/dashboard' },
          { label: 'Venue Management', to: '/register-venue', icon: faBuilding, match: '/register-venue' },
          { label: 'Slot Requests', to: '/venues/requests', icon: faCalendarCheck, match: '/venues/requests' },
        ],
      },
      { label: 'Host', to: '/become-host', icon: faUserTie, match: '/become-host' },
      { label: 'E-Commerce Brand', to: '/ecomm-brand', icon: faStore, match: '/ecomm-brand' },
    ],
  },
  { heading: 'Help', items: [{ label: 'FAQs', to: '/faqs', icon: faCircleQuestion, match: '/faqs' }, { label: 'Support', to: '/support', icon: faHeadset, match: '/support' }] },
];

// Rendered inside 'Partner Tools' only for users with the CLUB_ADMIN role.
const CLUB_ADMIN_GROUP: NavItem = {
  label: 'Club Admin',
  to: '/club-admin/dashboard',
  icon: faUsersGear,
  match: '/club-admin',
  children: [
    { label: 'Dashboard', to: '/club-admin/dashboard', icon: faGaugeHigh, match: '/club-admin/dashboard' },
    { label: 'Clubs', to: '/club-admin/clubs', icon: faBuilding, match: '/club-admin/clubs' },
  ],
};

const PUBLIC_POLICIES = gql`
  query PartnerSidebarPolicies {
    publicPolicies { id slug title }
  }
`;

const matchesPath = (pathname: string, item: NavItem): boolean => {
  if (item.children) return item.children.some((child) => matchesPath(pathname, child));
  if (item.match === '/') return pathname === '/';
  // The per-venue availability calendar belongs to the Venues group too.
  if (item.match === '/venues/dashboard' && /^\/venues\/[^/]+\/availability/.test(pathname)) return true;
  return pathname.startsWith(item.match);
};

export default function PartnerSidebar({ onCloseMobile }: Readonly<Props>) {
  const location = useLocation();
  const { data } = useQuery(PUBLIC_POLICIES, { fetchPolicy: 'cache-first' });
  const { logoUrl, appName, loading } = useBranding();
  const { user } = useUserData();
  const policies = data?.publicPolicies ?? [];
  const isClubAdmin = (user?.roles ?? []).includes('CLUB_ADMIN');

  const navSections = useMemo(
    () =>
      sections.map((section) =>
        section.heading === 'Partner Tools' && isClubAdmin
          ? { ...section, items: [...section.items, CLUB_ADMIN_GROUP] }
          : section
      ),
    [isClubAdmin]
  );

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
      <List component="nav" aria-label="Partner sections" sx={{ py: 1, flex: 1, overflowY: 'auto' }}>
        {navSections.map((section) => (
          <Box key={section.heading} sx={{ mb: 1 }}>
            <Typography variant="overline" sx={{ px: 2.5, color: 'text.secondary', fontWeight: 700, letterSpacing: 0.4, display: 'block', mt: 1 }}>
              {section.heading}
            </Typography>
            {section.items.map((item) =>
              item.children ? (
                <PartnerNavGroup key={item.label} item={item} pathname={location.pathname} onClick={onCloseMobile} />
              ) : (
                <PartnerNavItem key={item.to} item={item} active={matchesPath(location.pathname, item)} onClick={onCloseMobile} />
              )
            )}
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

function PartnerNavGroup({ item, pathname, onClick }: Readonly<{ item: NavItem; pathname: string; onClick?: () => void }>) {
  const groupActive = matchesPath(pathname, item);
  const [open, setOpen] = useState(groupActive);
  return (
    <>
      <ListItemButton
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        sx={{ borderRadius: 1, mx: 1, my: 0.25, color: groupActive ? 'primary.main' : 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><FontAwesomeIcon icon={item.icon} fixedWidth /></ListItemIcon>
        <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: groupActive ? 800 : 600, fontSize: 14, noWrap: true }} />
        {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {(item.children ?? []).map((child) => (
            <PartnerNavItem key={child.to} item={child} active={matchesPath(pathname, child)} onClick={onClick} nested />
          ))}
        </List>
      </Collapse>
    </>
  );
}

function PartnerNavItem({ item, active, onClick, nested = false }: Readonly<{ item: NavItem; active: boolean; onClick?: () => void; nested?: boolean }>) {
  return (
    <ListItemButton
      component={RouterLink}
      to={item.to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      sx={{ borderRadius: 1, mx: 1, my: 0.25, pl: nested ? 3.5 : 2, color: active ? 'primary.main' : 'text.secondary', bgcolor: active ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><FontAwesomeIcon icon={item.icon} fixedWidth /></ListItemIcon>
      <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 800 : 600, fontSize: nested ? 13.5 : 14, noWrap: true }} />
    </ListItemButton>
  );
}
