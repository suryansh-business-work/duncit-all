import { useState } from 'react';
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
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { NavLink, useLocation } from 'react-router-dom';
import { appConfig, type AppNavItem } from '../config/app-config';
import { useBranding } from '../lib/useBranding';
import AppIcon from './AppIcon';
import { HEADER_HEIGHT } from './AppShell';

const selectedSx = {
  '&.Mui-selected': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    '& .MuiListItemIcon-root': { color: 'inherit' },
  },
} as const;

const labelProps = { fontWeight: 600, variant: 'body2' as const };

function NavLeaf({ item, onNavigate, indent }: Readonly<{ item: AppNavItem; onNavigate?: () => void; indent?: boolean }>) {
  const location = useLocation();
  return (
    <ListItemButton
      component={NavLink}
      to={item.to!}
      selected={location.pathname === item.to}
      onClick={onNavigate}
      sx={{ mb: 0.25, py: 0.75, pl: indent ? 3.25 : undefined, ...selectedSx }}
    >
      <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>
        <AppIcon name={item.icon} fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={item.label} primaryTypographyProps={labelProps} />
    </ListItemButton>
  );
}

function NavGroup({
  label,
  icon,
  items,
  onNavigate,
}: Readonly<{
  label: string;
  icon: string;
  items: AppNavItem[];
  onNavigate?: () => void;
}>) {
  const location = useLocation();
  const [open, setOpen] = useState(items.some((c) => location.pathname === c.to));
  return (
    <>
      <ListItemButton onClick={() => setOpen((o) => !o)} sx={{ mb: 0.25, py: 0.75 }}>
        <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>
          <AppIcon name={icon} fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={label} primaryTypographyProps={labelProps} />
        {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {items.map((child) => (
            <NavLeaf key={child.label} item={child} onNavigate={onNavigate} indent />
          ))}
        </List>
      </Collapse>
    </>
  );
}

export default function AppSidebar({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
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
        {appConfig.nav.map((item) =>
          item.children ? (
            <NavGroup key={item.label} label={item.label} icon={item.icon} items={item.children} onNavigate={onNavigate} />
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
