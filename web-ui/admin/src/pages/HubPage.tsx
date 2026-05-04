import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import GroupsIcon from '@mui/icons-material/Groups';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SettingsIcon from '@mui/icons-material/Settings';
import type { ReactNode } from 'react';

interface HubCard {
  key: string;
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
  gradient: string;
}

const CARDS: HubCard[] = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    description: 'Live KPIs, growth charts and platform health.',
    to: '/dashboard',
    icon: <DashboardIcon sx={{ fontSize: 36 }} />,
    gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  },
  {
    key: 'users',
    title: 'User Management',
    description: 'Users, roles, permissions and access control.',
    to: '/users',
    icon: <GroupIcon sx={{ fontSize: 36 }} />,
    gradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)',
  },
  {
    key: 'catalog',
    title: 'Catalog',
    description: 'Categories, locations and home sliders.',
    to: '/categories',
    icon: <CategoryIcon sx={{ fontSize: 36 }} />,
    gradient: 'linear-gradient(135deg,#10b981,#34d399)',
  },
  {
    key: 'community',
    title: 'Community',
    description: 'Clubs, pods and member-submitted ideas.',
    to: '/clubs',
    icon: <GroupsIcon sx={{ fontSize: 36 }} />,
    gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
  },
  {
    key: 'engagement',
    title: 'Engagement',
    description: 'Notifications, FAQs, policies and emails.',
    to: '/notifications',
    icon: <NotificationsActiveIcon sx={{ fontSize: 36 }} />,
    gradient: 'linear-gradient(135deg,#ef4444,#f97316)',
  },
  {
    key: 'finance',
    title: 'Finance',
    description: 'Payments, fees, GST, invoices and payouts.',
    to: '/finance/dashboard',
    icon: <AccountBalanceIcon sx={{ fontSize: 36 }} />,
    gradient: 'linear-gradient(135deg,#14b8a6,#06b6d4)',
  },
  {
    key: 'system',
    title: 'System',
    description: 'Feature flags, branding and global settings.',
    to: '/feature-flags',
    icon: <SettingsIcon sx={{ fontSize: 36 }} />,
    gradient: 'linear-gradient(135deg,#64748b,#475569)',
  },
];

export default function HubPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: { xs: 3, md: 5 } }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Welcome back
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pick a module to get started. Each section opens its own focused workspace.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
        }}
      >
        {CARDS.map((c) => (
          <Card
            key={c.key}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: (t) => `1px solid ${t.palette.divider}`,
              overflow: 'hidden',
              transition: 'transform .18s ease, box-shadow .18s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
            }}
          >
            <CardActionArea
              onClick={() => navigate(c.to)}
              sx={{ height: '100%' }}
            >
              <Box
                sx={{
                  height: 90,
                  background: c.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  px: 3,
                  color: '#fff',
                }}
              >
                {c.icon}
              </Box>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {c.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {c.description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
