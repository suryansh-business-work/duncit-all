import { IconButton, Stack, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useTranslation } from '@duncit/shell';

interface Props {
  pod: { is_deleted?: boolean | null };
  onEdit: (pod: any) => void;
  onQuickEdit: (pod: any) => void;
  onDelete: (pod: any) => void;
  onComplete: (pod: any) => void;
}

/** A cancelled pod stays editable (that is the point of listing it), but it can
 * no longer be completed or deleted — both would fail at the server. */
export default function PodActionButtons({ pod, onEdit, onQuickEdit, onDelete, onComplete }: Readonly<Props>) {
  const { t } = useTranslation();
  const cancelled = !!pod.is_deleted;
  return (
    <Stack direction="row" spacing={0.25} justifyContent="flex-end">
      {!cancelled && (
        <Tooltip title={t('admin.completePod.title')}>
          <IconButton size="small" color="success" onClick={() => onComplete(pod)}>
            <TaskAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={t('admin.pods.quickEditHint')}>
        <IconButton size="small" onClick={() => onQuickEdit(pod)}>
          <EditNoteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('shell.common.edit')}>
        <IconButton size="small" onClick={() => onEdit(pod)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {!cancelled && (
        <Tooltip title={t('shell.common.delete')}>
          <IconButton size="small" onClick={() => onDelete(pod)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}