import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Container, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import ModuleIcon, { type ModuleIconKind } from '../components/ModuleIcon';
import TypingWelcome from './hub-page/TypingWelcome';
import { useTranslation } from '@duncit/shell';

interface HubCard {
  key: string;
  title: string;
  description: string;
  to: string;
  icon: ModuleIconKind;
  accent: string;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const hubCards = (t: Translate): HubCard[] => [
  {
    key: 'dashboard',
    title: t('admin.hub.dashboard'),
    description: t('admin.hub.dashboardHint'),
    to: '/dashboard',
    icon: 'dashboard',
    accent: '#2563eb',
  },
  {
    key: 'users',
    title: t('admin.hub.userManagement'),
    description: t('admin.hub.userManagementHint'),
    to: '/users',
    icon: 'users',
    accent: '#0f766e',
  },
  {
    key: 'catalog',
    title: t('admin.hub.catalog'),
    description: t('admin.hub.catalogHint'),
    to: '/categories',
    icon: 'catalog',
    accent: '#16a34a',
  },
  {
    key: 'community',
    title: t('admin.hub.community'),
    description: t('admin.hub.communityHint'),
    to: '/clubs',
    icon: 'community',
    accent: '#d97706',
  },
  {
    key: 'engagement',
    title: t('admin.hub.engagement'),
    description: t('admin.hub.engagementHint'),
    to: '/faqs',
    icon: 'engagement',
    accent: '#dc2626',
  },
  {
    key: 'system',
    title: t('admin.hub.system'),
    description: t('admin.hub.systemHint'),
    to: '/branding',
    icon: 'system',
    accent: '#475569',
  },
];

/** One module tile. Hoisted so the grid can render it as a widget body. */
function HubTile({ card }: Readonly<{ card: HubCard }>) {
  const navigate = useNavigate();
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 1,
        border: (t) => `1px solid ${t.palette.divider}`,
        overflow: 'hidden',
        transition: 'transform .18s ease, box-shadow .18s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <CardActionArea
        onClick={() => navigate(card.to)}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{
            minHeight: 118,
            backgroundColor: alpha(card.accent, 0.075),
            borderBottom: (t) => `1px solid ${t.palette.divider}`,
            px: 2,
          }}
        >
          <ModuleIcon kind={card.icon} color={card.accent} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
              Module
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: card.accent }}>
              {card.title}
            </Typography>
          </Box>
        </Stack>
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {card.description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

/**
 * The Admin console's landing board.
 *
 * Every tile is its own widget: which module somebody opens first is entirely a
 * matter of what their job is, and the six-card order here is just the order
 * they happened to be written in.
 */
export default function HubPage() {
  const { t } = useTranslation();
  const widgets: DashboardWidget[] = hubCards(t).map((card, index) => ({
    id: card.key,
    bare: true,
    defaultLayout: { x: (index % 3) * 4, y: Math.floor(index / 3) * 3, w: 4, h: 3 },
    minW: 3,
    minH: 3,
    content: <HubTile card={card} />,
  }));

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <DuncitDashboard
        dashboardId="admin.hub"
        header={
          <Box>
            <TypingWelcome />
            <Typography variant="body1" color="text.secondary">
              Pick a module to get started. Each section opens its own focused workspace.
            </Typography>
          </Box>
        }
        widgets={widgets}
      />
    </Container>
  );
}
