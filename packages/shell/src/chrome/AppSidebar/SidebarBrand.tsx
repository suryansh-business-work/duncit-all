import { Box, Skeleton, Typography } from '@mui/material';
import { NavLink } from 'react-router';
import { tokens } from '@duncit/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useBranding } from '../../hooks/useBranding';

export interface SidebarBrandProps {
  /** Portal short name shown next to the branding logo. */
  name: string;
  /** Icon rail: the short name is dropped and the logo shrinks to fit. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

/** The sidebar's top row: the branding logo, linking home. */
export function SidebarBrand({ name, collapsed = false, onNavigate }: Readonly<SidebarBrandProps>) {
  const { t } = useTranslation();
  const { logoUrl, appName, loading, onLogoError } = useBranding();
  return (
    <Box
      component={NavLink}
      to="/"
      onClick={onNavigate}
      aria-label={t('shell.chrome.goHome')}
      sx={{
        minHeight: tokens.size.headerHeight,
        px: collapsed ? 1 : 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 1.25,
        borderBottom: 1,
        borderColor: 'divider',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {loading ? (
        <Skeleton variant="rounded" width={collapsed ? 40 : 96} height={24} />
      ) : (
        <Box
          component="img"
          src={logoUrl}
          alt={appName}
          onError={onLogoError}
          sx={{ height: 26, width: 'auto', maxWidth: collapsed ? 48 : 130, objectFit: 'contain' }}
        />
      )}
      {!collapsed && (
        <Typography
          variant="caption"
          color="primary"
          noWrap
          sx={{
            fontWeight: 800,
            letterSpacing: 0.3
          }}>
          {name}
        </Typography>
      )}
    </Box>
  );
}
