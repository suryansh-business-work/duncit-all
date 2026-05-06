import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ExploreIcon from '@mui/icons-material/Explore';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { value: '/', label: 'Home', icon: <HomeIcon /> },
  { value: '/explore', label: 'Explore', icon: <ExploreIcon /> },
  { value: '/clubs', label: 'Clubs', icon: <GroupsIcon /> },
  { value: '/chats', label: 'Chats', icon: <ChatBubbleOutlineIcon /> },
  { value: '/profile', label: 'Your Profile', icon: <PersonOutlineIcon /> },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Match the top-level segment so /clubs/:id still highlights "Clubs", etc.
  const active =
    TABS.slice()
      .sort((a, b) => b.value.length - a.value.length)
      .find((t) => (t.value === '/' ? pathname === '/' : pathname.startsWith(t.value)))
      ?.value ?? '/';

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        borderTop: 1,
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation
        value={active}
        onChange={(_e, value) => navigate(value)}
        showLabels
      >
        {TABS.map((t) => (
          <BottomNavigationAction
            key={t.value}
            label={t.label}
            value={t.value}
            icon={t.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
