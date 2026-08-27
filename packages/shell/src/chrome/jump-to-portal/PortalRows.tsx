import { Chip, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import type { PortalAccessEntry } from './queries';

/** A console this user can open — the row is the link, in a new tab. */
export function PortalLinkRow({ portal }: Readonly<{ portal: PortalAccessEntry }>) {
  return (
    <ListItemButton component="a" href={portal.url} target="_blank" rel="noopener">
      <ListItemIcon sx={{ minWidth: 36 }}>
        <LaunchIcon fontSize="small" color="primary" />
      </ListItemIcon>
      <ListItemText primary={portal.name} secondary={portal.url} />
    </ListItemButton>
  );
}

interface RequestRowProps {
  portal: PortalAccessEntry;
  /** True while this row's request mutation is in flight. */
  busy: boolean;
  onRequest: (portalKey: string) => void;
}

/** A console this user cannot open — name + the request-access action. */
export function PortalRequestRow({ portal, busy, onRequest }: Readonly<RequestRowProps>) {
  const { t } = useTranslation();
  const pending = portal.request_status === 'PENDING';

  let action = null;
  if (pending) {
    action = <Chip size="small" color="warning" variant="outlined" label={t('shell.jumpToPortal.requested')} />;
  } else if (portal.can_request) {
    action = (
      <DuncitButton size="small" variant="outlined" disabled={busy} onClick={() => onRequest(portal.key)}>
        {t('shell.jumpToPortal.requestAccess')}
      </DuncitButton>
    );
  } else {
    action = (
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('shell.jumpToPortal.notRequestable')}
      </Typography>
    );
  }

  let secondary = portal.url;
  if (pending) secondary = t('shell.jumpToPortal.requestedHint');
  else if (portal.request_status === 'DENIED') secondary = t('shell.jumpToPortal.deniedHint');

  return (
    <ListItem secondaryAction={action}>
      <ListItemIcon sx={{ minWidth: 36 }}>
        <LockOutlinedIcon fontSize="small" color="disabled" />
      </ListItemIcon>
      <ListItemText primary={portal.name} secondary={secondary} sx={{ pr: 12 }} />
    </ListItem>
  );
}
