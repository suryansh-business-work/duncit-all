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

  /*
    Three states on one button, hoisted to nesting 0 (Sonar S3358). Once a code
    is live the only question is whether the next one is on its way, so this
    never says "Send" — that word belongs to the button before the first code,
    which is companionVerifyCta.
  */
  const sent = live && !!otp.challengeId;
  let sendLabel = labels.companionVerifyCta;
  if (sent) sendLabel = otp.sending ? labels.otpSending : labels.otpResend;

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {state === 'BLOCKED' ? labels.companionOtpBlocked : labels.companionOtpHint}
      </Typography>
      <DuncitButton
        size="small"
        variant={sent ? 'text' : 'outlined'}
        startIcon={<WhatsAppIcon />}
        disabled={state !== 'READY' || otp.sending}
        onClick={send}
        data-testid={`companion-otp-send-${index}`}
        sx={{ alignSelf: 'flex-start', borderRadius: 999, fontWeight: 800 }}
      >
        {sendLabel}
      </DuncitButton>

      {sent && (
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
