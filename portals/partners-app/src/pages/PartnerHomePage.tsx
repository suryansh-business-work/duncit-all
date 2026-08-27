import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoxOpen,
  faBuilding,
  faUserTie,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useTranslation } from '@duncit/shell';

interface PartnerAction {
  id: string;
  title: string;
  text: string;
  path: string;
  icon: IconDefinition;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const actions = (t: Translate): PartnerAction[] => [
  {
    id: 'register-venue',
    title: t('partners.common.registerYourVenue'),
    text: 'Submit your space, documents, owner details, and photos for partner review.',
    path: '/register-venue',
    icon: faBuilding,
  },
  {
    id: 'become-host',
    title: t('partners.page.beAHost'),
    text: 'Complete identity, verification, and address details to become a Duncit host.',
    path: '/become-host',
    icon: faUserTie,
  },
  {
    id: 'list-products',
    title: t('partners.page.listYourProducts'),
    text: 'Sell your products via Duncit. Hosts can select approved products during pod creation.',
    path: '/list-products',
    icon: faBoxOpen,
  },
];

/** One partner path. Hoisted so the grid can render it as a widget body. */
function ActionTile({ action }: Readonly<{ action: PartnerAction }>) {
  const { t } = useTranslation();
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
          <Typography variant="h6" sx={{
            fontWeight: 900
          }}>{action.title}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>{action.text}</Typography>
          <DuncitButton component={RouterLink} to={action.path} variant="contained">{t('partners.page.start')}</DuncitButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function PartnerHomePage() {
  const { t } = useTranslation();
  const widgets: DashboardWidget[] = actions(t).map((action, index) => ({
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
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>{t('partners.common.duncitPartners')}</Typography>
          <Typography variant="h4" sx={{
            fontWeight: 950
          }}>{t('partners.page.chooseYourPartnerPath')}</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 1 }}>{t('partners.page.useTheSameDuncitAccountFor')}</Typography>
        </Box>
      }
      widgets={widgets}
    />
  );
}
