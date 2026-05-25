import { Box, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import { appConfig } from '../config/app-config';
import AppIcon from './AppIcon';

export default function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ px: 2.25, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box component="img" src="/duncit-logo.svg" alt="Duncit" sx={{ height: 34, width: 'auto', maxWidth: 150, objectFit: 'contain' }} />
        <Typography variant="subtitle2" sx={{ mt: 1 }} color="primary" fontWeight={800}>
          {appConfig.name} Console
        </Typography>
      </Box>
      <List sx={{ px: 1.25, py: 1.5, flex: 1 }}>
        {appConfig.nav.map((item) => {
          const selected = location.pathname === item.to;
          return (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              selected={selected}
              onClick={onNavigate}
              sx={{ mb: 0.5, '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText', '& .MuiListItemIcon-root': { color: 'inherit' } } }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>
                <AppIcon name={item.icon} fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ px: 2.25, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          {appConfig.fullName}
        </Typography>
      </Box>
    </Stack>
  );
}
