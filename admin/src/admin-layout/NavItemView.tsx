import { Link as RouterLink } from 'react-router-dom';
import { Box, Collapse, ListItemIcon, ListItemText } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { isNavGroup, type NavGroup, type NavLeaf } from './navConfig';
import { NavItem } from './styled';

interface Props {
  item: NavLeaf | NavGroup;
  navQuery: string;
  openGroups: Record<string, boolean>;
  toggleGroup: (label: string) => void;
  isPathActive: (to: string) => boolean;
  isGroupActive: (g: NavGroup) => boolean;
  onCloseMobile: () => void;
}

export default function NavItemView({
  item,
  navQuery,
  openGroups,
  toggleGroup,
  isPathActive,
  isGroupActive,
  onCloseMobile,
}: Props) {
  if (isNavGroup(item)) {
    const open = navQuery ? true : !!openGroups[item.label];
    const groupActive = isGroupActive(item);
    return (
      <Box>
        <NavItem active={groupActive && !open} onClick={() => toggleGroup(item.label)}>
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
              onClick={onCloseMobile}
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
      component={RouterLink}
      to={item.to}
      active={isPathActive(item.to)}
      onClick={onCloseMobile}
    >
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
      />
    </NavItem>
  );
}
