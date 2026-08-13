import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxOpen, faBuilding, faUserTie, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';

interface PartnerAction {
  id: string;
  title: string;
  text: string;
  path: string;
  icon: IconDefinition;
}

const actions: PartnerAction[] = [
  {
    id: 'register-venue',
    title: 'Register your venue',
    text: 'Submit your space, documents, owner details, and photos for partner review.',
    path: '/register-venue',
    icon: faBuilding,
  },
  {
    id: 'become-host',
    title: 'Be a host',
    text: 'Complete identity, verification, and address details to become a Duncit host.',
    path: '/become-host',
    icon: faUserTie,
  },
  {
    id: 'list-products',
    title: 'List your products',
    text: 'Sell your products via Duncit. Hosts can select approved products during pod creation.',
    path: '/list-products',
    icon: faBoxOpen,
  },
];

/** One partner path. Hoisted so the grid can render it as a widget body. */
function ActionTile({ action }: Readonly<{ action: PartnerAction }>) {
  const theme = useTheme();
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Box
            sx={{
              height: 132,
              borderRadius: 1.25,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              border: 1,
              borderColor: 'divider',
              color: 'primary.main',
            }}
          >
            <FontAwesomeIcon icon={action.icon} style={{ fontSize: 62 }} />
          </Box>
          <Typography variant="h6" fontWeight={900}>{action.title}</Typography>
          <Typography variant="body2" color="text.secondary">{action.text}</Typography>
          <Button component={RouterLink} to={action.path} variant="contained">Start</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function PartnerHomePage() {
  const widgets: DashboardWidget[] = actions.map((action, index) => ({
    id: action.id,
    bare: true,
    defaultLayout: { x: index * 4, y: 0, w: 4, h: 5 },
    minW: 3,
    minH: 4,
    content: <ActionTile action={action} />,
  }));

  return (
    <DuncitDashboard
      dashboardId="partners.home"
      header={
        <Box sx={{ p: 2.5, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>Duncit Partners</Typography>
          <Typography variant="h4" fontWeight={950}>Choose your partner path</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 1 }}>Use the same Duncit account for venue and host applications.</Typography>
        </Box>
      }
      widgets={widgets}
    />
  );
}
