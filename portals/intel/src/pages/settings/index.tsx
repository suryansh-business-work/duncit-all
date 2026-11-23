import { Navigate, NavLink, useNavigate, useParams } from 'react-router';
import { Box, Button, List, ListItemButton, ListItemText, Paper, Stack, useMediaQuery, useTheme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from '@duncit/app-settings';
import { EmptyState, PageHeader } from '@duncit/ui';
import { useBootstrap } from '../../components/IntelBootstrap';
import SectionContent from './SectionContent';
import { isSettingsSection, SETTINGS_SECTIONS } from './sections';

/**
 * intel.duncit.com/setting — a section list beside the open section on wide
 * screens; on a phone, the list first and one section at a time with Back.
 * Admin and above (the server refuses everyone else regardless).
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const { section } = useParams();
  const { data: boot } = useBootstrap();
  if (boot && !boot.me.can_admin) return <EmptyState title={t('intel.common.adminOnly')} />;
  if (section && !isSettingsSection(section)) return <Navigate to="/setting" replace />;
  if (!section && wide) return <Navigate to="/setting/general" replace />;
  const current = section && isSettingsSection(section) ? section : null;

  const nav = (
    <Paper variant="outlined" sx={{ borderRadius: 2, width: { xs: '100%', md: 250 }, flexShrink: 0, alignSelf: 'flex-start', position: { md: 'sticky' }, top: { md: 80 } }}>
      <List dense aria-label={t('intel.settings.title')}>
        {SETTINGS_SECTIONS.map((s) => (
          <ListItemButton key={s.key} component={NavLink} to={`/setting/${s.key}`} selected={current === s.key}>
            <ListItemText primary={t(s.label)} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );

  return (
    <Stack spacing={2}>
      <PageHeader title={t('intel.settings.title')} subtitle={t('intel.settings.subtitle')} />
      {!wide && current && (
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/setting')}>
            {t('intel.settings.allSections')}
          </Button>
        </Box>
      )}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        {(wide || !current) && nav}
        {current && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SectionContent section={current} />
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
