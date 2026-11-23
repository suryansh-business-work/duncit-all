import { useId, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { JumpToPortalDialog } from '../jump-to-portal';
import { MY_PORTAL_ACCESS, type PortalAccessEntry } from '../jump-to-portal/queries';
import { portalsByRole, roleLabel } from './roles-for-portals';

interface Props {
  open: boolean;
  onClose: () => void;
  roles: readonly string[];
}

/** The header's role info: every assigned role, the consoles each opens, and Jump to Portal. */
export function UserRolesDialog({ open, onClose, roles }: Readonly<Props>) {
  const { t } = useTranslation();
  const headingId = useId();
  const [jumpOpen, setJumpOpen] = useState(false);
  const { data, loading, error } = useQuery<{ myPortalAccess: PortalAccessEntry[] }>(
    MY_PORTAL_ACCESS,
    { fetchPolicy: 'cache-and-network', skip: !open }
  );
  const rows = useMemo(() => portalsByRole(roles, data?.myPortalAccess ?? []), [roles, data]);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={headingId} data-testid="user-roles-dialog">
        <DialogTitle sx={{ pr: 6 }}>
          <span id={headingId}>{t('shell.userRoles.title')}</span>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('shell.userRoles.subtitle')}
          </Typography>
          <DuncitIconButton onClick={onClose} aria-label={t('shell.userRoles.close')} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </DuncitIconButton>
        </DialogTitle>
        <DialogContent>
          {loading && !data && (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {error && !data && <Alert severity="error" data-testid="user-roles-load-error">{t('shell.jumpToPortal.loadError')}</Alert>}
          {roles.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('shell.userRoles.noRoles')}</Typography>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            {rows.map(({ role, portals }) => (
              <Box key={role} data-testid={`user-roles-role-${role}`}>
                <Typography sx={{ fontWeight: 700 }}>{roleLabel(role)}</Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                  {portals.map((portal) => (
                    <Link
                      key={portal.key}
                      href={portal.url}
                      target="_blank"
                      rel="noopener"
                      underline="none"
                      sx={{ '&:hover .MuiChip-root': { bgcolor: 'action.hover' } }}
                      data-testid={`user-roles-open-${role}-${portal.key}`}
                    >
                      <Chip size="small" variant="outlined" color="primary" icon={<LaunchIcon />} label={portal.name} />
                    </Link>
                  ))}
                  {data && portals.length === 0 && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('shell.userRoles.noPortals')}</Typography>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton variant="outlined" onClick={() => setJumpOpen(true)} data-testid="user-roles-jump">
            {t('shell.jumpToPortal.title')}
          </DuncitButton>
        </DialogActions>
      </Dialog>
      <JumpToPortalDialog open={jumpOpen} onClose={() => setJumpOpen(false)} />
    </>
  );
}
