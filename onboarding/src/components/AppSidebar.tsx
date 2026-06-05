import { useState } from 'react';
import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText, Skeleton, Stack, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NavLink, useLocation } from 'react-router-dom';
import { appConfig, type AppNavItem } from '../config/app-config';
import { useBranding } from '../lib/useBranding';
import AppIcon from './AppIcon';
import { HEADER_HEIGHT } from './AppShell';

const matches = (pathname: string, to?: string) => !!to && (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

function NavLeaf({ item, onNavigate, nested }: { item: AppNavItem; onNavigate?: () => void; nested?: boolean }) {
  const location = useLocation();
  return (
    <ListItemButton
      component={NavLink}
      to={item.to ?? '#'}
      selected={matches(location.pathname, item.to)}
      onClick={onNavigate}
      sx={{
        mb: 0.25,
        py: 0.75,
        pl: nested ? 3 : undefined,
        '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText', '& .MuiListItemIcon-root': { color: 'inherit' } },
      }}
    >
      <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}><AppIcon name={item.icon} fontSize="small" /></ListItemIcon>
      <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }} />
    </ListItemButton>
  );
}

function NavGroup({ item, onNavigate }: { item: AppNavItem; onNavigate?: () => void }) {
  const location = useLocation();
  const active = (item.children ?? []).some((c) => matches(location.pathname, c.to));
  const [open, setOpen] = useState(active);
  return (
    <Box sx={{ mb: 0.25 }}>
      <ListItemButton onClick={() => setOpen((v) => !v)} sx={{ py: 0.75 }}>
        <ListItemIcon sx={{ minWidth: 34, color: active ? 'primary.main' : 'text.secondary' }}><AppIcon name={item.icon} fontSize="small" /></ListItemIcon>
        <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 800 : 600, variant: 'body2', color: active ? 'primary.main' : 'inherit' }} />
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {(item.children ?? []).map((child) => <NavLeaf key={child.label} item={child} onNavigate={onNavigate} nested />)}
        </List>
      </Collapse>
    </Box>
  );
}

export default function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
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
      <List sx={{ px: 1, py: 1, flex: 1, overflowY: 'auto' }}>
        {appConfig.nav.map((item) =>
          item.children && item.children.length > 0 ? (
            <NavGroup key={item.label} item={item} onNavigate={onNavigate} />
          ) : (
            <NavLeaf key={item.label} item={item} onNavigate={onNavigate} />
          ),
        )}
      </List>
      <Box sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {appConfig.fullName}
        </Typography>
      </Box>
    </Stack>
  );
}
