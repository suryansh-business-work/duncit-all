import { Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { requiredLabel } from './requiredLabel';
import type { ClubFormValues } from '../types';

/** The four bullet-list fields on the club form. */
type BulletFieldName = 'who_we_are' | 'what_we_do' | 'perks' | 'values';

interface Props {
  name: BulletFieldName;
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

/** Add/remove list of single-line bullet points backed by a RHF field array
 * (stable `field.id` keys — never the array index, S6479). */
export default function BulletListField({ name, label, helperText, error, required }: Readonly<Props>) {
  const { control } = useFormContext<ClubFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: name as never });

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={700}>
        {requiredLabel(label, required)}
      </Typography>
      {helperText && (
        <Typography variant="caption" color="text.secondary">
          {helperText}
        </Typography>
      )}
      {fields.map((field, index) => (
        <Stack key={field.id} direction="row" spacing={1} alignItems="center">
          <Controller
            control={control}
            name={`${name}.${index}` as const}
            render={({ field: input }) => (
              <TextField
                {...input}
                value={input.value ?? ''}
                fullWidth
                size="small"
                placeholder={`Point ${index + 1}`}
              />
            )}
          />
          <IconButton aria-label={`Remove point ${index + 1}`} onClick={() => remove(index)}>
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ))}
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
      <Button size="small" startIcon={<AddIcon />} onClick={() => append('')} sx={{ alignSelf: 'flex-start' }}>
        Add point
      </Button>
    </Stack>
  );
}
