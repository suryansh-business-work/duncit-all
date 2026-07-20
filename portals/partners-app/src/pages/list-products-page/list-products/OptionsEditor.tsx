import { Autocomplete, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import { Controller, useFieldArray, type Control, type Path } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import type { ProductListingValues } from './list-products.types';

interface Props {
  control: Control<ProductListingValues>;
  onGenerate: () => void;
}

/** Define the product's options (Size, Colour, …) and their values. "Generate
 * variants" builds one variant per combination (the option matrix). */
export default function OptionsEditor({ control, onGenerate }: Readonly<Props>) {
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" fontWeight={800}>
        Options (e.g. Size, Colour)
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Add the options your product varies by, then generate a variant for every combination.
      </Typography>
      {fields.map((field, index) => (
        <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
          <RhfTextField
            control={control}
            name={`options.${index}.name` as Path<ProductListingValues>}
            label="Option name"
            sx={{ maxWidth: 200 }}
          />
          <Controller
            control={control}
            name={`options.${index}.values` as Path<ProductListingValues>}
            render={({ field: valuesField, fieldState }) => (
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={(valuesField.value as string[] | undefined) ?? []}
                onChange={(_event, next) => valuesField.onChange(next)}
                sx={{ flex: 1, minWidth: 220 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Values"
                    placeholder="Type a value + Enter"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? 'e.g. S, M, L'}
                  />
                )}
              />
            )}
          />
          <IconButton aria-label="Remove option" color="error" onClick={() => remove(index)} sx={{ mt: 1 }}>
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      ))}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => append({ name: '', values: [] })} sx={{ alignSelf: 'flex-start' }}>
          Add option
        </Button>
        <Button
          variant="contained"
          startIcon={<AutoAwesomeMotionIcon />}
          onClick={onGenerate}
          disabled={fields.length === 0}
          sx={{ alignSelf: 'flex-start' }}
        >
          Generate variants
        </Button>
      </Stack>
    </Stack>
  );
}
