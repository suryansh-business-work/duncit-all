import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ModuleIcon, { type ModuleIconKind } from '../components/ModuleIcon';
import TypingWelcome from './hub-page/TypingWelcome';

interface HubCard {
  key: string;
  title: string;
  description: string;
  to: string;
  icon: ModuleIconKind;
  accent: string;
}

const CARDS: HubCard[] = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    description: 'Live KPIs, growth charts and platform health.',
    to: '/dashboard',
    icon: 'dashboard',
    accent: '#2563eb',
  },
  {
    key: 'users',
    title: 'User Management',
    description: 'Users, roles, permissions and access control.',
    to: '/users',
    icon: 'users',
    accent: '#0f766e',
  },
  {
    key: 'catalog',
    title: 'Catalog',
    description: 'Categories, locations and home sliders.',
    to: '/categories',
    icon: 'catalog',
    accent: '#16a34a',
  },
  {
    key: 'campaign',
    title: 'Campaign',
    description: 'Email and WhatsApp campaign workspaces.',
    to: '/marketing/email-campaigns',
    icon: 'campaign',
    accent: '#c2410c',
  },
  {
    key: 'inventory',
    title: 'Inventory',
    description: 'Duncit products, stock counts and pod product requests.',
    to: '/inventory',
    icon: 'inventory',
    accent: '#9333ea',
  },
  {
    key: 'community',
    title: 'Community',
    description: 'Clubs, pods and member-submitted ideas.',
    to: '/clubs',
    icon: 'community',
    accent: '#d97706',
  },
  {
    key: 'engagement',
    title: 'Engagement',
    description: 'Notifications, FAQs, policies, email templates and badges.',
    to: '/notifications',
    icon: 'engagement',
    accent: '#dc2626',
  },
  {
    key: 'onboarding',
    title: 'Onboarding',
    description: 'Review and approve venue & host applications.',
    to: '/venues',
    icon: 'onboarding',
    accent: '#7c3aed',
  },
  {
    key: 'system',
    title: 'System',
    description: 'Feature flags, branding and global settings.',
    to: '/feature-flags',
    icon: 'system',
    accent: '#475569',
  },
];

export default function HubPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: { xs: 3, md: 5 } }}>
        <TypingWelcome />
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
              borderRadius: 1,
              border: (t) => `1px solid ${t.palette.divider}`,
              overflow: 'hidden',
              transition: 'transform .18s ease, box-shadow .18s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
          >
            <CardActionArea
              onClick={() => navigate(c.to)}
              sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{
                  minHeight: 118,
                  backgroundColor: alpha(c.accent, 0.075),
                  borderBottom: (t) => `1px solid ${t.palette.divider}`,
                  px: 2,
                }}
              >
                <ModuleIcon kind={c.icon} color={c.accent} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                    Module
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: c.accent }}>
                    {c.title}
                  </Typography>
                </Box>
              </Stack>
              <CardContent sx={{ flex: 1 }}>
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
