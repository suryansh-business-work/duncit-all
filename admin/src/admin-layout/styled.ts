import { Box, ListItemButton } from '@mui/material';
import { styled } from '@mui/material/styles';

export const DRAWER_WIDTH = 264;
export const HEADER_HEIGHT = 48;

export const Root = styled(Box)({
  display: 'flex',
  minHeight: '100vh',
});

export const Brand = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  minHeight: HEADER_HEIGHT,
  boxSizing: 'border-box',
  padding: theme.spacing(1, 2),
}));

export const Main = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  backgroundColor: theme.palette.background.default,
}));

export const Content = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
}));

export const NavItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'depth',
})<{ active?: boolean; depth?: number; component?: React.ElementType; to?: string }>(
  ({ theme, active, depth = 0 }) => ({
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(0.25, 1),
    padding: theme.spacing(0.85, 1.5),
    paddingLeft: theme.spacing(1.5 + depth * 2),
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    backgroundColor: active ? theme.palette.action.selected : 'transparent',
    '& .MuiListItemIcon-root': {
      minWidth: 36,
      color: 'inherit',
    },
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  })
);
