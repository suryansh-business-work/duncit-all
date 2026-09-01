import { useEffect } from 'react';
import { z } from 'zod';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { EarnMeetingLabels } from '../labels';
import { blankMeetingReasonValues, type MeetingReasonValues } from './meeting-reason.types';

/** Built from the surface's labels: a validation message is copy the user
 *  reads, so it follows their language like the rest of the dialog (rule 38). */
export const buildMeetingReasonSchema = (labels: EarnMeetingLabels) =>
  z.object({
    reason: z.string().trim().min(1, labels.reasonRequired).max(500, labels.reasonTooLong),
  });

interface Props {
  formId: string;
  label: string;
  helperText: string;
  labels: EarnMeetingLabels;
  onSubmit: (reason: string) => void;
}

/** Mandatory-reason field (RHF + Zod) for reschedule / cancel dialogs. */
export default function MeetingReasonForm({
  formId,
  label,
  helperText,
  labels,
  onSubmit,
}: Readonly<Props>) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeetingReasonValues, any, MeetingReasonValues>({
    resolver: zodResolver(buildMeetingReasonSchema(labels)) as unknown as Resolver<MeetingReasonValues, any, MeetingReasonValues>,
    defaultValues: blankMeetingReasonValues,
  });

  // Reset when the dialog using this form re-mounts.
  useEffect(() => reset(blankMeetingReasonValues), [reset]);

  const submit = handleSubmit((values) => onSubmit(values.reason.trim()));

  return (
    <form id={formId} onSubmit={submit}>
      <TextField
        label={label}
        required
        fullWidth
        multiline
        minRows={2}
        autoFocus
        {...register('reason')}
        error={!!errors.reason}
        helperText={errors.reason?.message ?? helperText}
      />
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          mt: 0.75,
          color: 'text.secondary'
        }}>
        <AutoAwesomeIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption">{labels.aiMonitoring}</Typography>
      </Stack>
    </form>
  );
}
