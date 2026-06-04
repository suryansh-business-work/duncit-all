import { Avatar, Box, Chip, Stack, TextField, Typography } from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CallWave from './CallWave';

interface Props {
  number: string;
  /** Live status label, e.g. "Ringing…", "In call", "Call over". */
  statusLabel: string;
  tone: 'default' | 'info' | 'success' | 'warning' | 'error';
  active: boolean;
  ai?: boolean;
}

/** Split a stored number into a dialling code + local number for display. */
function splitNumber(raw: string): { code: string; number: string } {
  const s = String(raw || '').trim();
  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    if (digits.length > 10) return { code: `+${digits.slice(0, digits.length - 10)}`, number: digits.slice(-10) };
    return { code: '+', number: digits };
  }
  return { code: '+91', number: s.replace(/\D/g, '') };
}

/**
 * Shared "calling" visual for the portal + AI call dialogs: a pulsing call
 * avatar, the disabled code + number fields, a live status chip and the speech
 * wave (animated while the call is active).
 */
export default function CallStage({ number, statusLabel, tone, active, ai }: Props) {
  const { code, number: local } = splitNumber(number);
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
      <Box
        sx={{
          position: 'relative',
          '@keyframes crmCallPulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(99,102,241,0.45)' },
            '70%': { boxShadow: '0 0 0 18px rgba(99,102,241,0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
          },
        }}
      >
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: active ? 'primary.main' : 'action.selected',
            animation: active ? 'crmCallPulse 1.6s infinite' : 'none',
          }}
        >
          {ai ? <SmartToyIcon fontSize="large" /> : <PhoneInTalkIcon fontSize="large" />}
        </Avatar>
      </Box>

      <Chip color={tone} label={statusLabel} />

      <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
        <TextField label="Code" size="small" value={code} disabled sx={{ width: 96 }} />
        <TextField label="Number" size="small" value={local} disabled fullWidth />
      </Stack>

      <Box sx={{ width: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
          {ai ? 'AI VOICE' : 'LIVE CALL'}
        </Typography>
        <CallWave active={active} color={ai ? '#10b981' : '#6366f1'} />
      </Box>
    </Stack>
  );
}
