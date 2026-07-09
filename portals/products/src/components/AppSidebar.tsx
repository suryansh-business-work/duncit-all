import { Fragment } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import { appConfig } from '../config/app-config';
import { isProductNavItem } from '../config/product-nav';
import { useBranding } from '../lib/useBranding';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import AppIcon from './AppIcon';
import { HEADER_HEIGHT } from './AppShell';

export default function AppSidebar({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  const location = useLocation();
  const { logoUrl, appName, loading } = useBranding();
  const showProducts = useFeatureFlag('is_product_visible');
  // With products gated off, drop the product-specific nav entries.
  const navItems = showProducts
    ? appConfig.nav
    : appConfig.nav.filter((item) => !isProductNavItem(item.to));
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
        {navItems.map((item, index) => {
          const selected = location.pathname === item.to;
          // A group header shows once, above the first item of each section.
          const showHeader = !!item.group && item.group !== navItems[index - 1]?.group;
          return (
            <Fragment key={item.to}>
              {showHeader && (
                <ListSubheader
                  disableSticky
                  sx={{
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    lineHeight: 2.2,
                    px: 1.5,
                    mt: 0.5,
                  }}
                >
                  {item.group}
                </ListSubheader>
              )}
              <ListItemButton
                component={NavLink}
                to={item.to}
                selected={selected}
                onClick={onNavigate}
                sx={{
                  mb: 0.25,
                  py: 0.75,
                  borderRadius: 1,
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
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                />
              </ListItemButton>
            </Fragment>
          );
        })}
      </List>
      <Box sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {appConfig.fullName}
        </Typography>
      </Box>
    </Stack>
  );
}
