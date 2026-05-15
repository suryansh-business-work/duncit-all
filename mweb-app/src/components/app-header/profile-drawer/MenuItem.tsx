import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { MenuItem as MenuItemData } from './useMenuItems';

interface MenuItemRowProps {
  item: MenuItemData;
}

export default function MenuItemRow({ item }: MenuItemRowProps) {
  return (
    <ListItem disablePadding sx={{ px: 1.25, py: 0.25 }}>
      <ListItemButton onClick={item.onClick} sx={{ px: 1.5, py: 1.15, borderRadius: 2.5, '&:hover': { bgcolor: 'action.hover' } }}>
        <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>{item.icon}</ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{ fontSize: 14, fontWeight: 800 }}
        />
      </ListItemButton>
    </ListItem>
  );
}
