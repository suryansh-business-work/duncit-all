import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@mui/material';
import { blankMeetingReasonValues, type MeetingReasonValues } from './meeting-reason.types';

export const meetingReasonSchema = z.object({
  reason: z.string().trim().min(1, 'Please tell us a reason.').max(500, 'Keep the reason under 500 characters.'),
});

interface Props {
  formId: string;
  label: string;
  helperText: string;
  onSubmit: (reason: string) => void;
}

/** Mandatory-reason field (RHF + Zod) for reschedule / cancel dialogs. */
export default function MeetingReasonForm({ formId, label, helperText, onSubmit }: Readonly<Props>) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeetingReasonValues>({
    resolver: zodResolver(meetingReasonSchema),
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
    </form>
  );
}
