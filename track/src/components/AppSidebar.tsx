import { useMemo, useState } from 'react';
import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NavLink, useLocation } from 'react-router-dom';
import { appConfig, type AppNavItem } from '../config/app-config';
import { useBranding } from '../lib/useBranding';
import AppIcon from './AppIcon';
import { HEADER_HEIGHT } from './AppShell';

interface SidebarProps {
  onNavigate?: () => void;
}

interface NodeProps {
  item: AppNavItem;
  pathname: string;
  onNavigate?: () => void;
}

const matches = (pathname: string, to?: string) => {
  if (!to) return false;
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
};

const groupActive = (pathname: string, item: AppNavItem): boolean =>
  Boolean(item.children?.some((child) => matches(pathname, child.to) || groupActive(pathname, child)));

function LeafItem({ item, pathname, onNavigate }: NodeProps) {
  const selected = matches(pathname, item.to);
  return (
    <ListItemButton
      component={NavLink}
      to={item.to ?? '#'}
      selected={selected}
      onClick={onNavigate}
      sx={{
        mb: 0.25,
        py: 0.75,
        '&.Mui-selected': {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '& .MuiListItemIcon-root': { color: 'inherit' },
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>
        <AppIcon name={item.icon} fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }} />
    </ListItemButton>
  );
}

function GroupItem({ item, pathname, onNavigate }: NodeProps) {
  const active = useMemo(() => groupActive(pathname, item), [pathname, item]);
  const [open, setOpen] = useState(active);
  return (
    <Box sx={{ mb: 0.25 }}>
      <ListItemButton onClick={() => setOpen((v) => !v)} sx={{ py: 0.75 }}>
        <ListItemIcon sx={{ minWidth: 34, color: active ? 'primary.main' : 'text.secondary' }}>
          <AppIcon name={item.icon} fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{ fontWeight: active ? 800 : 600, variant: 'body2', color: active ? 'primary.main' : 'inherit' }}
        />
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {(item.children ?? []).map((child) => (
            <NavNode key={child.label} item={child} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </List>
      </Collapse>
    </Box>
  );
}

function NavNode({ item, pathname, onNavigate }: NodeProps) {
  if (item.children && item.children.length > 0) {
    return <GroupItem item={item} pathname={pathname} onNavigate={onNavigate} />;
  }
  return <LeafItem item={item} pathname={pathname} onNavigate={onNavigate} />;
}

export default function AppSidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const { logoUrl, appName, loading } = useBranding();
  return (
    <Stack sx={{ height: '100%' }}>
      <Box
        sx={{
          minHeight: HEADER_HEIGHT,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {loading ? (
          <Skeleton variant="rounded" width={96} height={24} />
        ) : (
          <Box
            component="img"
            src={logoUrl}
            alt={appName}
            sx={{ height: 26, width: 'auto', maxWidth: 130, objectFit: 'contain' }}
          />
        )}
        <Typography variant="caption" color="primary" fontWeight={800} sx={{ letterSpacing: 0.3 }} noWrap>
          {appConfig.name}
        </Typography>
      </Box>
      <List sx={{ px: 1, py: 1, flex: 1 }}>
        {appConfig.nav.map((item) => (
          <NavNode key={item.label} item={item} pathname={location.pathname} onNavigate={onNavigate} />
        ))}
      </List>
      <Box sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {appConfig.fullName}
        </Typography>
      </Box>
    </Stack>
  );
}
