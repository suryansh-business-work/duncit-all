import { Stack, Tooltip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { DuncitIconButton } from '@duncit/buttons';
import { usePortalT } from '../../../shared/i18n';
import type { LiteAdminEventRow } from '../../graphql/events';

interface Props {
  row: LiteAdminEventRow;
  onFeatured: (row: LiteAdminEventRow) => void;
  onHidden: (row: LiteAdminEventRow) => void;
  onCancel: (row: LiteAdminEventRow) => void;
}

/** The three admin switches on an event row: featured, hidden, cancel. */
export function EventActions({ row, onFeatured, onHidden, onCancel }: Readonly<Props>) {
  const { t } = usePortalT();
  const vars = { vars: { title: row.title } };
  const featuredLabel = row.featured ? t('litePortal.events.unfeature', vars) : t('litePortal.events.feature', vars);
  const hiddenLabel = row.hidden ? t('litePortal.events.unhide', vars) : t('litePortal.events.hide', vars);
  const cancelled = row.status === 'CANCELLED';
  const cancelLabel = cancelled ? t('litePortal.events.alreadyCancelled') : t('litePortal.events.cancel', vars);

  return (
    <Stack direction="row" spacing={0.5} component="span" sx={{ justifyContent: 'flex-end' }}>
      <Tooltip title={featuredLabel}>
        <DuncitIconButton size="small" aria-label={featuredLabel} aria-pressed={row.featured} onClick={() => onFeatured(row)} data-testid={`event-featured-${row.id}`}>
          {row.featured ? <StarIcon fontSize="small" color="primary" /> : <StarBorderIcon fontSize="small" />}
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={hiddenLabel}>
        <DuncitIconButton size="small" aria-label={hiddenLabel} aria-pressed={row.hidden} onClick={() => onHidden(row)} data-testid={`event-hidden-${row.id}`}>
          {row.hidden ? <VisibilityOffIcon fontSize="small" color="warning" /> : <VisibilityIcon fontSize="small" />}
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={cancelLabel}>
        <span>
          <DuncitIconButton size="small" color="error" disabled={cancelled} aria-label={cancelLabel} onClick={() => onCancel(row)} data-testid={`event-cancel-${row.id}`}>
            <EventBusyIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
