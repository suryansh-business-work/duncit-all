import { IconButton, Stack, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

interface Props {
  pod: any;
  onEdit: (pod: any) => void;
  onDelete: (pod: any) => void;
  onComplete: (pod: any) => void;
}

export default function PodActionButtons({ pod, onEdit, onDelete, onComplete }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={0.25} justifyContent="flex-end">
      <Tooltip title="Complete this pod">
        <IconButton size="small" color="success" onClick={() => onComplete(pod)}>
          <TaskAltIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(pod)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" onClick={() => onDelete(pod)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}