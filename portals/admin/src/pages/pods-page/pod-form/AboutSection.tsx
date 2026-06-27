import { useFormContext } from 'react-hook-form';
import { Stack, TextField } from '@mui/material';
import RhfTextField from '../../../forms/components/RhfTextField';
import type { PodForm } from '../queries';

export default function AboutSection() {
  const { control, register } = useFormContext<PodForm>();
  return (
    <Stack spacing={2}>
      <RhfTextField
        control={control}
        name="pod_description"
        label="Description"
        required
        multiline
        minRows={3}
        hint=" "
      />
      <TextField
        label="Pod info / additional notes"
        fullWidth
        multiline
        minRows={2}
        helperText="Logistics, what to bring, parking notes, etc."
        {...register('pod_info')}
      />
    </Stack>
  );
}
