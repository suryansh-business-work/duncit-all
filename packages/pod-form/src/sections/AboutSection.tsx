import { useFormContext } from 'react-hook-form';
import { Stack, TextField } from '@mui/material';
import RhfTextField from '../components/RhfTextField';
import type { PodFormValues } from '../types';

export default function AboutSection() {
  const { control, register } = useFormContext<PodFormValues>();
  return (
    <Stack spacing={2}>
      <RhfTextField
        control={control}
        name="pod_description"
        label="Description"
        required
        multiline
        minRows={3}
        hint="At least 10 characters"
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
