import { Controller, useFieldArray, type Control } from 'react-hook-form';
import { Divider, Stack, TextField, Typography } from '@mui/material';
import type { PodAttendanceLabels } from '@duncit/utils';
import type { ForceMarkValues } from './force.form';

interface Props {
  control: Control<ForceMarkValues>;
  labels: PodAttendanceLabels;
  seats: number;
}

/**
 * The rest of a multi-seat booking, as far as the admin was told.
 *
 * The host collects these at the door, where the group is standing in front of
 * them and a phone number is reasonable to ask for. An admin is collecting them
 * from a phone call about a pod that already happened, so the number is
 * optional and a blank row is allowed — the mark goes through either way. That
 * is the whole difference between this and the scanner's companion step, and it
 * is why the two are separate forms rather than one with a flag.
 */
export default function ForceCompanionFields({ control, labels, seats }: Readonly<Props>) {
  // `fields` carries a stable id per row, which is what the key needs — these
  // rows have no id of their own until somebody types a name into them.
  const { fields } = useFieldArray({ control, name: 'companions' });
  if (fields.length === 0) return null;

  return (
    <Stack spacing={1.25}>
      <Divider />
      <Stack spacing={0.25}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {labels.forceCompanionsTitle}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {labels.forceCompanionsBody(seats, fields.length)}
        </Typography>
      </Stack>

      {fields.map((field, index) => (
        <Stack key={field.id} spacing={0.75} data-testid={`force-companion-${index}`}>
          <Controller
            control={control}
            name={`companions.${index}.name`}
            render={({ field: input, fieldState }) => (
              <TextField
                {...input}
                label={labels.forceCompanionName}
                size="small"
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Stack direction="row" spacing={1}>
            <Controller
              control={control}
              name={`companions.${index}.phone_extension`}
              render={({ field: input, fieldState }) => (
                <TextField
                  {...input}
                  label={labels.otpExtension}
                  size="small"
                  sx={{ width: 120 }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`companions.${index}.phone_number`}
              render={({ field: input, fieldState }) => (
                <TextField
                  {...input}
                  label={labels.forceCompanionPhone}
                  size="small"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
