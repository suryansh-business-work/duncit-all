import { Checkbox, FormControlLabel, FormLabel, Stack, Typography } from '@mui/material';
import { OTP_MEDIUMS, type OtpMedium, type PodAttendanceLabels } from '@duncit/utils';

interface Props {
  labels: PodAttendanceLabels;
  value: OtpMedium[];
  onChange: (next: OtpMedium[]) => void;
  error?: string;
}

/**
 * Which channels the code goes out on.
 *
 * A multi-select rather than a radio: the medium is a parameter to ONE shared
 * OTP service, and sending on both at once is a single request — a host at a
 * noisy door should not have to guess which one the attendee will see first.
 */
export default function MediumPicker({ labels, value, onChange, error }: Readonly<Props>) {
  const toggle = (medium: OtpMedium) => {
    onChange(value.includes(medium) ? value.filter((m) => m !== medium) : [...value, medium]);
  };
  const labelFor = (medium: OtpMedium) =>
    medium === 'WHATSAPP' ? labels.otpMediumWhatsapp : labels.otpMediumSms;

  return (
    <Stack spacing={0.25}>
      <FormLabel sx={{ fontSize: 12, fontWeight: 700 }}>{labels.otpMediumLabel}</FormLabel>
      <Stack direction="row" spacing={1}>
        {OTP_MEDIUMS.map((medium) => (
          <FormControlLabel
            key={medium}
            control={
              <Checkbox
                size="small"
                checked={value.includes(medium)}
                onChange={() => toggle(medium)}
              />
            }
            label={labelFor(medium)}
          />
        ))}
      </Stack>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
