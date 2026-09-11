import { Box, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { SURFACE_SX } from '../../../theme';
import { useTranslation } from '../../../i18n/useTranslation';
import MenuRow from './MenuRow';

interface DrawerFooterProps {
  onLogout: () => void;
}

/** Logout row (danger) + app version. Native twin: Sidebar/SidebarFooter. */
export default function DrawerFooter({ onLogout }: Readonly<DrawerFooterProps>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ px: 2, pt: 0.5, pb: 1.5 }}>
      <Box sx={{ ...SURFACE_SX, overflow: 'hidden' }}>
        <MenuRow
          icon={<LogoutIcon />}
          label={t('mweb.common.logout')}
          tone="danger"
          chevron={false}
          onClick={onLogout}
        />
      </Box>
      <Typography
        sx={{
          fontSize: 12,
          color: 'text.secondary',
          display: 'block',
          textAlign: 'center',
          mt: 1,
        }}
      >
        App version {__APP_VERSION__}
      </Typography>
    </Box>
  );
}
