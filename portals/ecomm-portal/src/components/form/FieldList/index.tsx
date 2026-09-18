import { useFieldArray, type ArrayPath, type Control, type FieldArray, type FieldValues } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import FieldListRow, { type ListColumn } from './FieldListRow';

export type { ListColumn };

interface RhfFieldListProps<T extends FieldValues, N extends ArrayPath<T>> {
  control: Control<T>;
  name: N;
  columns: readonly ListColumn[];
  /** What a freshly added row holds. */
  blank: FieldArray<T, N>;
  addLabel: string;
  /** Names row `position` (1-based) for its buttons and its group, e.g. "Highlight 2". */
  itemLabel: (position: number) => string;
  emptyText?: string;
  max?: number;
}

/**
 * An ordered list of small records — highlights, specifications, reasons,
 * social links, banner slides — edited in place: add, change, move, remove.
 */
export default function RhfFieldList<T extends FieldValues, N extends ArrayPath<T>>({
  control,
  name,
  columns,
  blank,
  addLabel,
  itemLabel,
  emptyText,
  max,
}: Readonly<RhfFieldListProps<T, N>>) {
  const { fields, append, remove, move } = useFieldArray({ control, name });
  const full = max !== undefined && fields.length >= max;
  return (
    <Stack spacing={1.25}>
      {fields.length === 0 && emptyText && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {emptyText}
        </Typography>
      )}
      {fields.map((field, index) => (
        <FieldListRow
          key={field.id}
          control={control}
          path={`${name}.${index}`}
          columns={columns}
          label={itemLabel(index + 1)}
          isFirst={index === 0}
          isLast={index === fields.length - 1}
          onMoveUp={() => move(index, index - 1)}
          onMoveDown={() => move(index, index + 1)}
          onRemove={() => remove(index)}
        />
      ))}
      <DuncitButton startIcon={<AddIcon />} onClick={() => append(blank)} disabled={full} sx={{ alignSelf: 'flex-start' }}>
        {addLabel}
      </DuncitButton>
    </Stack>
  );
}
