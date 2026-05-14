import { Stack, Typography } from '@mui/material';
import DateTimeField from '../../../components/DateTimeField';
import type { InterviewFormValues } from '../interview.form';

interface Props {
  values: InterviewFormValues;
  showError: (key: keyof InterviewFormValues) => boolean;
  helperText: (key: keyof InterviewFormValues, fallback?: string) => string;
  setFieldValue: (field: string, value: any) => void;
}

export default function InterviewScheduleFields({ values, showError, helperText, setFieldValue }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Stack flex={1}>
        <DateTimeField
          label="Start"
          value={values.customStart}
          onChange={(iso) => setFieldValue('customStart', iso)}
        />
        {showError('customStart') && (
          <Typography variant="caption" color="error">
            {helperText('customStart')}
          </Typography>
        )}
      </Stack>
      <Stack flex={1}>
        <DateTimeField
          label="End"
          value={values.customEnd}
          onChange={(iso) => setFieldValue('customEnd', iso)}
          minDateTime={values.customStart ? new Date(values.customStart) : null}
        />
        {showError('customEnd') && (
          <Typography variant="caption" color="error">
            {helperText('customEnd')}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}