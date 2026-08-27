import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { PodAttendanceLabels, PodAttendanceRow } from '@duncit/utils';
import MediumPicker from './MediumPicker';
import { REQUEST_ATTENDANCE_OTP, VERIFY_ATTENDANCE_OTP } from './queries';
import {
  attendanceOtpCodeSchema,
  attendanceOtpInitialValues,
  buildAttendanceOtpInput,
  buildAttendanceOtpSchema,
  type AttendanceOtpValues,
} from './otp.form';

interface Props {
  podId: string;
  row: PodAttendanceRow | null;
  labels: PodAttendanceLabels;
  onClose: () => void;
  /** Fires with the spendable challenge once the code checks out. */
  onVerified: (challengeId: string) => void;
}

/** Hoisted so the three-way choice sits at nesting 0 (Sonar S3358). */
function sendLabel(sending: boolean, sent: boolean, labels: PodAttendanceLabels): string {
  if (sending) return labels.otpSending;
  return sent ? labels.otpResend : labels.otpSend;
}

/**
 * Prove the attendee before the host marks them.
 *
 * Two steps in one dialog because they are one thought: confirm the name and
 * number the code goes to, then type the code back.
 *
 * Nothing is actually delivered yet — the server says so and hands back a test
 * code, which this renders. The challenge, its expiry, its attempt limit and
 * its single use are all real, so wiring a transport changes nothing here.
 */
export default function AttendanceOtpDialog({
  podId,
  row,
  labels,
  onClose,
  onVerified,
}: Readonly<Props>) {
  const { control, getValues, trigger, reset, setError, formState } = useForm<AttendanceOtpValues>({
    resolver: zodResolver(buildAttendanceOtpSchema(labels)),
    defaultValues: attendanceOtpInitialValues(row),
  });
  const [challengeId, setChallengeId] = useState('');
  const [testCode, setTestCode] = useState('');
  const [request, requestState] = useMutation(REQUEST_ATTENDANCE_OTP);
  const [verify, verifyState] = useMutation(VERIFY_ATTENDANCE_OTP);

  // A different attendee is a different challenge — never carry the previous
  // one's verified code onto somebody else's row.
  useEffect(() => {
    reset(attendanceOtpInitialValues(row));
    setChallengeId('');
    setTestCode('');
  }, [row, reset]);

  const send = async () => {
    // Everything except the code, which does not exist yet.
    const ok = await trigger(['name', 'extension', 'number', 'mediums']);
    if (!ok || !row) return;
    const result = await request({
      variables: { input: buildAttendanceOtpInput(getValues(), podId, row.membership_id) },
    });
    const issued = result.data?.requestPodAttendanceOtp;
    setChallengeId(issued?.challenge_id ?? '');
    setTestCode(issued?.test_code ?? '');
  };

  const submitCode = async () => {
    const parsed = attendanceOtpCodeSchema(labels).safeParse(getValues('code'));
    if (!parsed.success) {
      setError('code', { message: parsed.error.issues[0]?.message });
      return;
    }
    await verify({ variables: { challenge_id: challengeId, otp: parsed.data.trim() } });
    onVerified(challengeId);
  };

  return (
    <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{labels.otpTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.75} sx={{ pt: 0.5 }}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {labels.otpBody(row?.name ?? '')}
          </Typography>

          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={labels.otpName}
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
              name="extension"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
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
              name="number"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={labels.otpPhone}
                  size="small"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Stack>

          <Controller
            control={control}
            name="mediums"
            render={({ field, fieldState }) => (
              <MediumPicker
                labels={labels}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <DuncitButton
            variant={challengeId ? 'text' : 'contained'}
            onClick={() => {
              send().catch(() => undefined);
            }}
            disabled={requestState.loading}
            sx={{ borderRadius: 999, fontWeight: 800, alignSelf: 'flex-start' }}
          >
            {sendLabel(requestState.loading, !!challengeId, labels)}
          </DuncitButton>
          {requestState.error && <Alert severity="error">{requestState.error.message}</Alert>}

          {challengeId && (
            <>
              {testCode && <Alert severity="info">{labels.otpTestCode(testCode)}</Alert>}
              <Controller
                control={control}
                name="code"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label={labels.otpCode}
                    size="small"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    slotProps={{
                      htmlInput: { inputMode: 'numeric', maxLength: 6 }
                    }}
                  />
                )}
              />
              {verifyState.error && <Alert severity="error">{verifyState.error.message}</Alert>}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{labels.otpCancel}</DuncitButton>
        <DuncitButton
          variant="contained"
          disabled={!challengeId || verifyState.loading || formState.isSubmitting}
          onClick={() => {
            submitCode().catch(() => undefined);
          }}
          sx={{ borderRadius: 999, fontWeight: 800 }}
        >
          {verifyState.loading ? labels.otpVerifying : labels.otpVerify}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
