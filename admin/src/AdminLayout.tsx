import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CategoryIcon from '@mui/icons-material/Category';
import BoltIcon from '@mui/icons-material/Bolt';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import FlagIcon from '@mui/icons-material/Flag';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PercentIcon from '@mui/icons-material/Percent';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import DescriptionIcon from '@mui/icons-material/Description';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShieldIcon from '@mui/icons-material/Shield';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AppsIcon from '@mui/icons-material/Apps';
import SearchIcon from '@mui/icons-material/Search';
import { useColorMode } from './ColorModeContext';
import AdminBreadcrumbs from './components/AdminBreadcrumbs';

const DRAWER_WIDTH = 264;
const HEADER_HEIGHT = 48;

const Root = styled(Box)({
  display: 'flex',
  minHeight: '100vh',
});

const Brand = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  minHeight: HEADER_HEIGHT,
  boxSizing: 'border-box',
  padding: theme.spacing(1, 2),
}));

const Main = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  backgroundColor: theme.palette.background.default,
}));

const Content = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
}));

const NavItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'depth',
})<{ active?: boolean; depth?: number; component?: React.ElementType; to?: string }>(
  ({ theme, active, depth = 0 }) => ({
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(0.25, 1),
    padding: theme.spacing(0.85, 1.5),
    paddingLeft: theme.spacing(1.5 + depth * 2),
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    backgroundColor: active ? theme.palette.action.selected : 'transparent',
    '& .MuiListItemIcon-root': {
      minWidth: 36,
      color: 'inherit',
    },
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  })
);

export interface NavLeaf {
  label: string;
  to: string;
  icon: ReactNode;
}

export interface NavGroup {
  label: string;
  icon: ReactNode;
  matchPrefix?: string;
  children: NavLeaf[];
}

export interface NavSection {
  heading?: string;
  /** URL-prefix list — section is "active" when current path starts with one of these */
  prefixes?: string[];
  items: (NavLeaf | NavGroup)[];
}

export function isNavGroup(i: NavLeaf | NavGroup): i is NavGroup {
  return (i as NavGroup).children !== undefined;
}

function isGroup(i: NavLeaf | NavGroup): i is NavGroup {
  return isNavGroup(i);
}

export const NAV: NavSection[] = [
  {
    heading: 'Dashboard',
    prefixes: ['/dashboard'],
    items: [{ label: 'Dashboard', to: '/dashboard', icon: <DashboardIcon /> }],
  },
  {
    heading: 'User Management',
    prefixes: ['/users', '/rbac'],
    items: [
      {
        label: 'Users',
        icon: <GroupIcon />,
        matchPrefix: '/users',
        children: [{ label: 'All Users', to: '/users', icon: <PeopleIcon /> }],
      },
      {
        label: 'Access Control',
        icon: <AdminPanelSettingsIcon />,
        matchPrefix: '/rbac',
        children: [
          { label: 'Roles', to: '/rbac/roles', icon: <SecurityIcon /> },
          { label: 'Permissions', to: '/rbac/permissions', icon: <VpnKeyIcon /> },
          { label: 'Resources', to: '/rbac/resources', icon: <CategoryIcon /> },
          { label: 'Actions', to: '/rbac/actions', icon: <BoltIcon /> },
        ],
      },
    ],
  },
  {
    heading: 'Catalog',
    prefixes: ['/categories', '/locations', '/sliders'],
    items: [
      { label: 'Categories', to: '/categories', icon: <AccountTreeIcon /> },
      { label: 'Locations', to: '/locations', icon: <LocationOnIcon /> },
      { label: 'Sliders', to: '/sliders', icon: <ViewCarouselIcon /> },
    ],
  },
  {
    heading: 'Community',
    prefixes: ['/clubs', '/pods', '/pod-ideas'],
    items: [
      {
        label: 'Clubs',
        icon: <GroupsIcon />,
        matchPrefix: '/clubs',
        children: [
          { label: 'All Clubs', to: '/clubs', icon: <GroupsIcon /> },
          { label: 'Pods', to: '/pods', icon: <EventIcon /> },
          { label: 'Pod Ideas', to: '/pod-ideas', icon: <LightbulbIcon /> },
        ],
      },
    ],
  },
  {
    heading: 'Engagement',
    prefixes: [
      '/notifications',
      '/interview-requests',
      '/faqs',
      '/policies',
      '/email-templates',
      '/badges',
      '/faq-submissions',
    ],
    items: [
      { label: 'Notifications', to: '/notifications', icon: <NotificationsActiveIcon /> },
      { label: 'Interview Requests', to: '/interview-requests', icon: <EventAvailableIcon /> },
      { label: 'FAQs', to: '/faqs', icon: <HelpOutlineIcon /> },
      { label: 'FAQ Submissions', to: '/faq-submissions', icon: <HelpOutlineIcon /> },
      { label: 'Policies', to: '/policies', icon: <DescriptionIcon /> },
      { label: 'Email Templates', to: '/email-templates', icon: <MarkEmailReadIcon /> },
      { label: 'Badges', to: '/badges', icon: <ShieldIcon /> },
    ],
  },
  {
    heading: 'Website',
    prefixes: ['/newsletter', '/contact-submissions'],
    items: [
      { label: 'Newsletter', to: '/newsletter', icon: <MarkEmailReadIcon /> },
      { label: 'Contact Submissions', to: '/contact-submissions', icon: <MarkEmailReadIcon /> },
    ],
  },
  {
    heading: 'Onboarding',
    prefixes: ['/venues', '/hosts'],
    items: [
      { label: 'Venues', to: '/venues', icon: <StorefrontIcon /> },
      { label: 'Hosts', to: '/hosts', icon: <PeopleIcon /> },
    ],
  },
  {
    heading: 'Finance',
    prefixes: ['/finance'],
    items: [
      {
        label: 'Finance',
        icon: <AccountBalanceIcon />,
        matchPrefix: '/finance',
        children: [
          { label: 'Dashboard', to: '/finance/dashboard', icon: <DashboardCustomizeIcon /> },
          { label: 'Settings', to: '/finance/settings', icon: <SettingsIcon /> },
          { label: 'Payment Logs', to: '/finance/payment-logs', icon: <ReceiptLongIcon /> },
          { label: 'Platform Fees', to: '/finance/platform-fees', icon: <PercentIcon /> },
          { label: 'GST Management', to: '/finance/gst', icon: <RequestQuoteIcon /> },
          { label: 'Invoices', to: '/finance/invoices', icon: <DescriptionIcon /> },
          { label: 'Ledger', to: '/finance/ledger', icon: <MenuBookIcon /> },
          { label: 'Venue Finance', to: '/finance/venue', icon: <StorefrontIcon /> },
          { label: 'Insurance', to: '/finance/insurance', icon: <ShieldIcon /> },
          { label: 'Payout Cycles', to: '/finance/payouts', icon: <CalendarMonthIcon /> },
        ],
      },
    ],
  },
  {
    heading: 'System',
    prefixes: ['/feature-flags', '/branding', '/settings'],
    items: [
      { label: 'Feature Flags', to: '/feature-flags', icon: <FlagIcon /> },
      { label: 'Branding', to: '/branding', icon: <BrandingWatermarkIcon /> },
      { label: 'Settings', to: '/settings', icon: <SettingsIcon /> },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [navSearch, setNavSearch] = useState('');
  const { mode, toggle } = useColorMode();
  const location = useLocation();
  const navigate = useNavigate();

  const isPathActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  const isGroupActive = (g: NavGroup) =>
    g.children.some((c) => isPathActive(c.to)) ||
    (g.matchPrefix ? location.pathname.startsWith(g.matchPrefix) : false);

  const initialOpen = (): Record<string, boolean> => {
    const o: Record<string, boolean> = {};
    for (const s of NAV) {
      for (const i of s.items) {
        if (isGroup(i)) o[i.label] = isGroupActive(i);
      }
    }
    return o;
  };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const s of NAV) {
        for (const i of s.items) {
          if (isGroup(i) && isGroupActive(i)) next[i.label] = true;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAnchorEl(null);
    navigate('/login');
  };

  // Filter sidebar to only the active section so each "module" gets its own focused nav.
  // On /hub (or unmatched), show all sections collapsed as section overview.
  const navQuery = navSearch.trim().toLowerCase();
  const activeSections: NavSection[] =
    location.pathname === '/' || location.pathname.startsWith('/hub')
      ? []
      : NAV.filter(
          (s) => s.prefixes && s.prefixes.some((p) => location.pathname.startsWith(p))
        );
  const visibleNav: NavSection[] = useMemo(() => {
    if (!navQuery) return activeSections.length > 0 ? activeSections : NAV;

    return NAV.map((section) => {
      const sectionMatch = section.heading?.toLowerCase().includes(navQuery) ?? false;
      const items = section.items
        .map((item) => {
          if (!isGroup(item)) {
            return item.label.toLowerCase().includes(navQuery) || sectionMatch ? item : null;
          }

          const groupMatch = item.label.toLowerCase().includes(navQuery) || sectionMatch;
          const children = groupMatch
            ? item.children
            : item.children.filter((child) => child.label.toLowerCase().includes(navQuery));
          return groupMatch || children.length ? { ...item, children } : null;
        })
        .filter(Boolean) as (NavLeaf | NavGroup)[];

      return items.length ? { ...section, items } : null;
    }).filter(Boolean) as NavSection[];
  }, [activeSections, navQuery]);
  const showModulesItem = !navQuery || 'modules'.includes(navQuery) || 'hub'.includes(navQuery);

  const renderItem = (item: NavLeaf | NavGroup) => {
    if (isGroup(item)) {
      const open = navQuery ? true : !!openGroups[item.label];
      const groupActive = isGroupActive(item);
      return (
        <Box key={item.label}>
          <NavItem
            active={groupActive && !open}
            onClick={() => setOpenGroups((p) => ({ ...p, [item.label]: !p[item.label] }))}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
            />
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </NavItem>
          <Collapse in={open} timeout="auto" unmountOnExit>
            {item.children.map((c) => (
              <NavItem
                key={c.to}
                component={RouterLink}
                to={c.to}
                active={isPathActive(c.to)}
                depth={1}
                onClick={closeMobile}
              >
                <ListItemIcon>{c.icon}</ListItemIcon>
                <ListItemText
                  primary={c.label}
                  primaryTypographyProps={{ fontWeight: 500, fontSize: 13.5 }}
                />
              </NavItem>
            ))}
          </Collapse>
        </Box>
      );
    }
    return (
      <NavItem
        key={item.to}
        component={RouterLink}
        to={item.to}
        active={isPathActive(item.to)}
        onClick={closeMobile}
      >
        <ListItemIcon>{item.icon}</ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
        />
      </NavItem>
    );
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Brand>
        <Box
          component="img"
          src="/duncit-logo.svg"
          alt="Duncit"
          sx={{ height: 34, width: 'auto', maxWidth: 150, objectFit: 'contain' }}
        />
        <Box>
          <Typography variant="caption" color="text.secondary">
            Admin Console
          </Typography>
        </Box>
      </Brand>
      <Divider />
      <Box sx={{ p: 1.25 }}>
        <TextField
          value={navSearch}
          onChange={(event) => setNavSearch(event.target.value)}
          placeholder="Search menu"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <Divider />
      <List sx={{ py: 1, flex: 1, overflowY: 'auto' }}>
        {showModulesItem && (
          <NavItem
            component={RouterLink}
            to="/hub"
            active={location.pathname === '/hub'}
            onClick={closeMobile}
          >
            <ListItemIcon>
              <AppsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Modules"
              primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
            />
          </NavItem>
        )}
        {visibleNav.map((section, idx) => (
          <Box key={section.heading ?? `s-${idx}`} sx={{ mb: 1 }}>
            {section.heading && (
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ px: 2.5, fontWeight: 600, letterSpacing: 0.6, display: 'block', mt: 1 }}
              >
                {section.heading}
              </Typography>
            )}
            {section.items.map(renderItem)}
          </Box>
        ))}
        {!showModulesItem && visibleNav.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
            No menu matches found.
          </Typography>
        )}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          v1.0.0 · {mode === 'dark' ? 'Dark' : 'Light'} mode
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Root>
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="admin navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobile}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Main>
        <AppBar position="sticky">
          <Toolbar sx={{ gap: 1, minHeight: `${HEADER_HEIGHT}px !important`, px: 2 }}>
            {!isDesktop && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                aria-label="open navigation"
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
              <IconButton onClick={toggle} aria-label="toggle color mode">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Account">
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 13 }}>
                  A
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={!!anchorEl}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <AdminBreadcrumbs />
        <Content>{children}</Content>
      </Main>
    </Root>
  );
}
