import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { MenuItem as MenuItemData } from './useMenuItems';

interface MenuItemRowProps {
  item: MenuItemData;
}

export default function MenuItemRow({ item }: MenuItemRowProps) {
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={item.onClick} sx={{ px: 2.5, py: 1.25 }}>
        <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
        />
      </ListItemButton>
    </ListItem>
  );
}
