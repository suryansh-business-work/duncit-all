import { Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import type { ClubFormValues } from '../types';

/** Add/remove list of FAQ question + answer pairs, backed by a RHF field array
 * (stable `field.id` keys — never the array index, S6479). */
export default function FaqListField() {
  const { control } = useFormContext<ClubFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'faqs' });

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={700}>
        FAQs
      </Typography>
      {fields.map((field, index) => (
        <Stack
          key={field.id}
          spacing={1}
          sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Controller
              control={control}
              name={`faqs.${index}.question` as const}
              render={({ field: input }) => (
                <TextField {...input} value={input.value ?? ''} fullWidth size="small" label={`Question ${index + 1}`} />
              )}
            />
            <IconButton aria-label={`Remove FAQ ${index + 1}`} onClick={() => remove(index)}>
              <DeleteOutlineIcon />
            </IconButton>
          </Stack>
          <Controller
            control={control}
            name={`faqs.${index}.answer` as const}
            render={({ field: input }) => (
              <TextField {...input} value={input.value ?? ''} fullWidth size="small" multiline minRows={2} label="Answer" />
            )}
          />
        </Stack>
      ))}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => append({ question: '', answer: '' })}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add FAQ
      </Button>
    </Stack>
  );
}
