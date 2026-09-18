import type { ReactNode } from 'react';
import { ListItem, ListItemText } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { MoveDirection } from '../../lib/reorder';
import MoveButtons from '../MoveButtons';

export interface ReorderRowProps {
  name: string;
  secondary?: ReactNode;
  leading?: ReactNode;
  /** Indentation steps — a sub-category sits under its parent. */
  depth: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  busy: boolean;
  onMove: (direction: MoveDirection) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** One hand-ordered row: its name, then move up / move down / edit / delete, each named for the row. */
export default function ReorderRow({
  name,
  secondary,
  leading,
  depth,
  canMoveUp,
  canMoveDown,
  busy,
  onMove,
  onEdit,
  onDelete,
}: Readonly<ReorderRowProps>) {
  const { t } = useTranslation();
  return (
    <ListItem divider sx={{ pl: 2 + depth * 3, gap: 2, flexWrap: 'wrap' }}>
      {leading}
      <ListItemText
        primary={name}
        secondary={secondary}
        sx={{ minWidth: 160 }}
        slotProps={{ secondary: { component: 'div' } }}
      />
      <MoveButtons
        name={name}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        disabled={busy}
        onMoveUp={() => onMove(-1)}
        onMoveDown={() => onMove(1)}
      >
        <DuncitIconButton aria-label={t('shell.a11y.editNamed', { vars: { name } })} disabled={busy} onClick={onEdit}>
          <EditOutlinedIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton
          aria-label={t('shell.a11y.deleteNamed', { vars: { name } })}
          color="error"
          disabled={busy}
          onClick={onDelete}
        >
          <DeleteOutlineIcon fontSize="small" />
        </DuncitIconButton>
      </MoveButtons>
    </ListItem>
  );
}
