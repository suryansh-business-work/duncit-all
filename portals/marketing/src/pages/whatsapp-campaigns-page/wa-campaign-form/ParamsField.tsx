import type { ReactNode } from 'react';
import { useFieldArray, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { RhfTextField } from '@duncit/forms';

/** One template variable row. Hoisted so it isn't redefined each render (S6478). */
function ParamRow<T extends FieldValues>({
  control,
  index,
  onRemove,
}: Readonly<{ control: Control<T>; index: number; onRemove: () => void }>) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <RhfTextField
        control={control}
        name={`template_params.${index}.value` as Path<T>}
        label={`Param {{${index + 1}}}`}
        size="small"
        hint=" "
      />
      <Tooltip title="Remove parameter">
        <IconButton aria-label={`Remove parameter ${index + 1}`} onClick={onRemove} sx={{ mt: 0.5 }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

interface Props<T extends FieldValues> {
  control: Control<T>;
  /** What these params mean here — a campaign resolves variables per recipient,
   * a test send does not, so the caption is the caller's to write. */
  hint: ReactNode;
}

/**
 * The template's variables, in the order WhatsApp fills them. Generic over the
 * form so the campaign and the test send share one row list instead of keeping
 * two that must be kept identical.
 */
export default function ParamsField<T extends FieldValues>({ control, hint }: Readonly<Props<T>>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'template_params' as never,
  });

  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary">
        Template params
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
      {fields.map((field, index) => (
        <ParamRow key={field.id} control={control} index={index} onRemove={() => remove(index)} />
      ))}
      <Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append({ value: '' } as never)}
        >
          Add parameter
        </Button>
      </Box>
    </Stack>
  );
}
