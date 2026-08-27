import { Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
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
      <Typography variant="subtitle2" sx={{
        fontWeight: 700
      }}>
        {requiredLabel(label, required)}
      </Typography>
      {helperText && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {helperText}
        </Typography>
      )}
      {fields.map((field, index) => (
        <Stack key={field.id} direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
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
          <DuncitIconButton aria-label={`Remove point ${index + 1}`} onClick={() => remove(index)}>
            <DeleteOutlineIcon />
          </DuncitIconButton>
        </Stack>
      ))}
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
      <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => append('')} sx={{ alignSelf: 'flex-start' }}>
        Add point
      </DuncitButton>
    </Stack>
  );
}
