import { useFormikContext } from 'formik';
import { Stack, TextField } from '@mui/material';
import type { PodForm } from '../queries';

export default function AboutSection() {
  const { values, errors, touched, handleChange } = useFormikContext<PodForm>();
  return (
    <Stack spacing={2}>
      <TextField
        label="Description"
        name="pod_description"
        value={values.pod_description}
        onChange={handleChange}
        fullWidth
        multiline
        minRows={3}
        required
        error={!!touched.pod_description && !!errors.pod_description}
        helperText={touched.pod_description ? (errors.pod_description as string) : undefined}
      />
      <TextField
        label="Pod info / additional notes"
        name="pod_info"
        value={values.pod_info}
        onChange={handleChange}
        fullWidth
        multiline
        minRows={2}
        helperText="Logistics, what to bring, parking notes, etc."
      />
    </Stack>
  );
}
