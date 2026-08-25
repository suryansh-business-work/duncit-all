import { Box, Chip, List, ListItemButton, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { profileIcon } from './profileIcons';
import type { ProfileTile } from './profileSections';

interface ManageAccountListProps {
  title: string;
  items: readonly ProfileTile[];
  onNavigate: (to: string) => void;
}

/** A titled, grouped drawer list — icon + label + chevron rows. Reused for both
 * the Manage Account and Shop sections. */
export default function ManageAccountList({ title, items, onNavigate }: Readonly<ManageAccountListProps>) {
  return (
    <Box sx={{ px: 2, pb: 1.25 }}>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 600,
          letterSpacing: 0.4,
          pl: 0.5
        }}>
        {title}
      </Typography>
      <Paper variant="outlined" sx={{ mt: 0.5, borderRadius: '16px', overflow: 'hidden' }}>
        <List disablePadding>
          {items.map((item, index) => (
            <ListItemButton
              key={item.key}
              onClick={() => onNavigate(item.to)}
              divider={index < items.length - 1}
              sx={{ px: 1.75, py: 1.1 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                {profileIcon(item.icon)}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.caption || undefined}
                slotProps={{
                  primary: { sx: { fontWeight: 700 } },
                  secondary: { variant: 'caption' }
                }} />
              {item.badge && <Chip size="small" color="warning" label={item.badge} sx={{ mr: 0.75 }} />}
              <ChevronRightIcon fontSize="small" color="disabled" />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
