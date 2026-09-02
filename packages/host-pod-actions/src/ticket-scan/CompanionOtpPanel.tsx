import { useState } from 'react';
import { Alert, Chip, Stack, TextField, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { DuncitButton } from '@duncit/buttons';
import type { CompanionEntry, CompanionOtpState } from '@duncit/utils';
import type { HostPodActionLabels } from '../labels';
import type { CompanionOtpApi } from './useCompanionOtp';

interface Props {
  index: number;
  entry: CompanionEntry;
  state: CompanionOtpState;
  labels: HostPodActionLabels;
  otp: CompanionOtpApi;
  onVerified: (challengeId: string) => void;
}

/** Hoisted so the three-way choice sits at nesting 0 (Sonar S3358). */
function sendLabel(sending: boolean, sent: boolean, labels: HostPodActionLabels): string {
  if (sending) return labels.otpSending;
  return sent ? labels.otpResend : labels.otpSend;
}

/**
 * One companion's WhatsApp code — sent, then read back.
 *
 * Optional by design: an attendee whose phone is dead or abroad must still be
 * able to walk in, so this proves the people it can and records which ones
 * those were. What it must NOT do is prove two people at once, which is why the
 * button is dead on every other row while a code is live.
 */
export default function CompanionOtpPanel({
  index,
  entry,
  state,
  labels,
  otp,
  onVerified,
}: Readonly<Props>) {
  const [code, setCode] = useState('');
  const live = otp.activeIndex === index;

  if (state === 'VERIFIED') {
    return (
      <Chip
        size="small"
        color="success"
        icon={<CheckCircleIcon />}
        label={labels.companionVerified}
        data-testid={`companion-verified-${index}`}
        sx={{ alignSelf: 'flex-start', fontWeight: 800 }}
      />
    );
  }

  const send = () => {
    setCode('');
    otp.start(index, entry).catch(() => undefined);
  };

  const check = () => {
    otp
      .submit(code)
      .then((challengeId) => challengeId && onVerified(challengeId))
      .catch(() => undefined);
  };

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {state === 'BLOCKED' ? labels.companionOtpBlocked : labels.companionOtpHint}
      </Typography>
      <DuncitButton
        size="small"
        variant={live && otp.challengeId ? 'text' : 'outlined'}
        startIcon={<WhatsAppIcon />}
        disabled={state !== 'READY' || otp.sending}
        onClick={send}
        data-testid={`companion-otp-send-${index}`}
        sx={{ alignSelf: 'flex-start', borderRadius: 999, fontWeight: 800 }}
      >
        {live && otp.challengeId
          ? sendLabel(otp.sending, true, labels)
          : labels.companionVerifyCta}
      </DuncitButton>

      {live && otp.challengeId && (
        <Stack spacing={0.75}>
          {otp.testCode && <Alert severity="info">{labels.otpTestCode(otp.testCode)}</Alert>}
          <TextField
            size="small"
            label={labels.otpCode}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
            data-testid={`companion-otp-code-${index}`}
          />
          <Stack direction="row" spacing={1}>
            <DuncitButton
              size="small"
              variant="contained"
              disabled={otp.verifying}
              onClick={check}
              data-testid={`companion-otp-verify-${index}`}
              sx={{ borderRadius: 999, fontWeight: 800 }}
            >
              {otp.verifying ? labels.otpVerifying : labels.otpVerify}
            </DuncitButton>
            <DuncitButton size="small" onClick={otp.cancel}>
              {labels.otpCancel}
            </DuncitButton>
          </Stack>
        </Stack>
      )}

      {live && otp.error && <Alert severity="error">{otp.error}</Alert>}
    </Stack>
  );
}
