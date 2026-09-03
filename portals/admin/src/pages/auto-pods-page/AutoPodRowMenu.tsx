import { useState, type MouseEvent } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelScheduleSendIcon from '@mui/icons-material/CancelScheduleSend';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { isAutoPodCancellable, isAutoPodDeletable, isAutoPodEditable, isAutoPodPausable } from './helpers';
import type { AutoPodTableRow } from './queries';

export interface AutoPodRowMenuProps {
  row: AutoPodTableRow;
  t: (key: string) => string;
  onViewDetails: (row: AutoPodTableRow) => void;
  onEdit: (row: AutoPodTableRow) => void;
  onCancel: (row: AutoPodTableRow) => void;
  onDelete: (row: AutoPodTableRow) => void;
  onViewPod: (row: AutoPodTableRow) => void;
  onToggleActive: (row: AutoPodTableRow) => void;
}

/**
 * The row's three-dot menu: Edit, Activate / Deactivate, Open pod (once it
 * exists), Cancel and Delete. Cancel sits beside Delete rather than replacing
 * it: cancelling keeps the record (and its reason) for the books, deleting
 * removes it for good. Every item closes the menu before it acts, so a
 * confirmation dialog never opens under an open menu.
 */
export default function AutoPodRowMenu({
  row,
  t,
  onViewDetails,
  onEdit,
  onCancel,
  onDelete,
  onViewPod,
  onToggleActive,
}: Readonly<AutoPodRowMenuProps>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const close = () => setAnchor(null);
  const run = (action: (row: AutoPodTableRow) => void) => () => {
    close();
    action(row);
  };
  const paused = !row.is_active;
  const toggleIcon = paused ? <PlayCircleOutlinedIcon fontSize="small" /> : <PauseCircleOutlinedIcon fontSize="small" />;
  const toggleLabel = paused ? t('admin.autoPods.activate') : t('admin.autoPods.deactivate');

  return (
    <>
      <DuncitIconButton
        size="small"
        aria-label={t('admin.autoPods.moreActions')}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : undefined}
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </DuncitIconButton>
      <Menu anchorEl={anchor} open={open} onClose={close}>
        {/* The same door the row itself opens — the menu says so out loud. */}
        <MenuItem onClick={run(onViewDetails)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('admin.autoPods.viewDetails')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onEdit)} disabled={!isAutoPodEditable(row)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('admin.autoPods.edit')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onToggleActive)} disabled={!isAutoPodPausable(row)}>
          <ListItemIcon>{toggleIcon}</ListItemIcon>
          <ListItemText>{toggleLabel}</ListItemText>
        </MenuItem>
        {row.pod_id ? (
          <MenuItem onClick={run(onViewPod)}>
            <ListItemIcon>
              <OpenInNewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('admin.autoPods.viewPod')}</ListItemText>
          </MenuItem>
        ) : null}
        <MenuItem onClick={run(onCancel)} disabled={!isAutoPodCancellable(row)}>
          <ListItemIcon>
            <CancelScheduleSendIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText>{t('admin.autoPods.cancel')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onDelete)} disabled={!isAutoPodDeletable(row)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>{t('admin.autoPods.delete')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
