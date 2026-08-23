import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import type { ColorMode } from '../hooks/useColorMode';
import { useTranslation } from '../i18n';
import type { StatusEnvironment } from '../types';

interface HeaderProps {
  appName: string;
  logoUrl: string;
  environment: StatusEnvironment | null;
  mode: ColorMode;
  onToggleMode: () => void;
}

export default function Header({
  appName,
  logoUrl,
  environment,
  mode,
  onToggleMode,
}: Readonly<HeaderProps>) {
  const { t } = useTranslation();
  const toggleLabel =
    mode === 'dark' ? t('status.board.switchToLight') : t('status.board.switchToDark');
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
      gap={2}
      mb={4}
      component="header"
    >
      <Stack direction="row" spacing={1.75} alignItems="center">
        <Box
          component="img"
          src={logoUrl}
          alt={appName}
          sx={{ height: 40, width: 'auto', maxWidth: 140, borderRadius: 2, objectFit: 'contain' }}
        />
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h4" component="h1">
              {t('status.board.title', { vars: { app: appName } })}
            </Typography>
            {environment === 'staging' && (
              <Chip label={t('status.board.staging')} color="warning" size="small" />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t('status.board.subtitle', { vars: { app: appName } })}
          </Typography>
        </Box>
      </Stack>
      <IconButton onClick={onToggleMode} aria-label={toggleLabel} color="inherit">
        {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Stack>
  );
}
