import type { Control, FieldValues, Path } from 'react-hook-form';
import { Box, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import MoveButtons from '../../MoveButtons';
import RhfImageField from '../RhfImageField';

/** One input of a list row. */
export interface ListColumn {
  key: string;
  label: string;
  kind?: 'text' | 'multiline' | 'image';
  /** Marks the input required: the asterisk on its label. The list schema decides whether blank is refused. */
  required?: boolean;
}

interface FieldListRowProps<T extends FieldValues> {
  control: Control<T>;
  /** The row's own path, e.g. `highlights.2`. */
  path: string;
  columns: readonly ListColumn[];
  /** Names the row for its buttons, e.g. "Highlight 3". */
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function RowInput<T extends FieldValues>({
  control,
  name,
  column,
}: Readonly<{ control: Control<T>; name: Path<T>; column: ListColumn }>) {
  if (column.kind === 'image') return <RhfImageField control={control} name={name} label={column.label} required={column.required} />;
  const multiline = column.kind === 'multiline';
  return (
    <RhfTextField
      control={control}
      name={name}
      label={column.label}
      size="small"
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      required={column.required}
    />
  );
}

/** One row of a list editor: its inputs side by side, then move / remove. */
export default function FieldListRow<T extends FieldValues>({
  control,
  path,
  columns,
  label,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Readonly<FieldListRowProps<T>>) {
  const { t } = useTranslation();
  const wide = columns.length > 2;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start' }} role="group" aria-label={label}>
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          columnGap: 1.5,
          // Stacked on a phone, the next input's floating label needs this room.
          rowGap: 2,
          gridTemplateColumns: { xs: '1fr', sm: wide ? '1fr 1fr' : `repeat(${columns.length}, 1fr)` },
        }}
      >
        {columns.map((column) => (
          <RowInput key={column.key} control={control} name={`${path}.${column.key}` as Path<T>} column={column} />
        ))}
      </Box>
      <MoveButtons name={label} canMoveUp={!isFirst} canMoveDown={!isLast} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
        <DuncitIconButton aria-label={t('shell.a11y.removeNamed', { vars: { name: label } })} onClick={onRemove}>
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </MoveButtons>
    </Paper>
  );
}
