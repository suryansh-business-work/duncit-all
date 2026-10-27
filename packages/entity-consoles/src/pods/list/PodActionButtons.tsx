import { Stack, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { VisibilityIconButton } from '../../shared/visibility/VisibilityViews';

interface Props {
  pod: { id?: string; is_deleted?: boolean | null; is_hidden?: boolean | null };
  onEdit: (pod: any) => void;
  onQuickEdit: (pod: any) => void;
  onDelete: (pod: any) => void;
  onComplete: (pod: any) => void;
  /** Already bound to this row by the column — absent for a viewer who may not. */
  onToggleHidden?: () => void;
}

/** A cancelled pod stays editable (that is the point of listing it), but it can
 * no longer be completed or deleted — both would fail at the server. */
export default function PodActionButtons({
  pod,
  onEdit,
  onQuickEdit,
  onDelete,
  onComplete,
  onToggleHidden,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const cancelled = !!pod.is_deleted;
  return (
    <Stack direction="row" spacing={0.25} sx={{
      justifyContent: "flex-end"
    }}>
      {!cancelled && (
        <Tooltip title={t('admin.completePod.title')}>
          <DuncitIconButton size="small" color="success" onClick={() => onComplete(pod)} data-testid={`pod-complete-${pod.id}`}>
            <TaskAltIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
      {onToggleHidden && (
        <VisibilityIconButton hidden={!!pod.is_hidden} onClick={onToggleHidden} />
      )}
      <Tooltip title={t('admin.pods.quickEditHint')}>
        <DuncitIconButton size="small" onClick={() => onQuickEdit(pod)} data-testid={`pod-quick-edit-${pod.id}`}>
          <EditNoteIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={t('shell.common.edit')}>
        <DuncitIconButton size="small" onClick={() => onEdit(pod)} data-testid={`pod-edit-${pod.id}`}>
          <EditIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      {!cancelled && (
        <Tooltip title={t('shell.common.delete')}>
          <DuncitIconButton size="small" onClick={() => onDelete(pod)} data-testid={`pod-delete-${pod.id}`}>
            <DeleteIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
    </Stack>
  );
}