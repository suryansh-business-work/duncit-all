import { Box, List, ListItemButton, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { profileIcon } from './profileIcons';
import type { ProfileTile } from './profileSections';

interface ManageAccountListProps {
  items: ProfileTile[];
  onNavigate: (to: string) => void;
}

/** The "Manage Account" grouped list — icon + label + chevron rows. */
export default function ManageAccountList({ items, onNavigate }: Readonly<ManageAccountListProps>) {
  return (
    <Box sx={{ px: 2.5, pb: 2 }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ fontWeight: 800, letterSpacing: 0.4, pl: 0.5 }}
      >
        Manage Account
      </Typography>
      <Paper variant="outlined" sx={{ mt: 0.5, borderRadius: 3.5, overflow: 'hidden' }}>
        <List disablePadding>
          {items.map((item, index) => (
            <ListItemButton
              key={item.key}
              onClick={() => onNavigate(item.to)}
              divider={index < items.length - 1}
              sx={{ px: 2, py: 1.35 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                {profileIcon(item.icon)}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700 }} />
              <ChevronRightIcon fontSize="small" color="disabled" />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
