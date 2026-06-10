import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import EastIcon from '@mui/icons-material/East';
import CallWave from './CallWave';

interface Props {
  /** Caller-ID (From) — the Tech-portal Twilio number. */
  fromNumber: string;
  /** Destination (To) — the customer's contact number. */
  toNumber: string;
  /** Live status label, e.g. "Ringing…", "In call", "Call over". */
  statusLabel: string;
  tone: 'default' | 'info' | 'success' | 'warning' | 'error';
  active: boolean;
  ai?: boolean;
}

const fmt = (raw: string): string => {
  const s = String(raw || '').trim();
  if (!s) return '—';
  if (s.startsWith('+')) return s;
  const digits = s.replace(/\D/g, '').replace(/^0+/, '');
  return `+91 ${digits}`;
};

function Leg({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box sx={{ textAlign: 'center', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} noWrap>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Shared call visual: shows the direct route From (Twilio config caller-ID) →
 * To (customer), with an AI badge in the middle for AI calls. Below: a pulsing
 * call avatar, live status chip and the speech wave (animated while active).
 */
export default function CallStage({ fromNumber, toNumber, statusLabel, tone, active, ai }: Readonly<Props>) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }} justifyContent="center">
        <Leg label="CALL FROM" value={fmt(fromNumber)} />
        <Stack alignItems="center" spacing={0.25}>
          <EastIcon fontSize="small" color="disabled" />
          {ai && <Chip size="small" color="primary" icon={<SmartToyIcon />} label="AI" sx={{ height: 22 }} />}
        </Stack>
        <Leg label="CALL TO" value={fmt(toNumber)} />
      </Stack>

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
            width: 60,
            height: 60,
            bgcolor: active ? 'primary.main' : 'action.selected',
            animation: active ? 'crmCallPulse 1.6s infinite' : 'none',
          }}
        >
          {ai ? <SmartToyIcon fontSize="large" /> : <PhoneInTalkIcon fontSize="large" />}
        </Avatar>
      </Box>

      <Chip color={tone} label={statusLabel} />

      <Box sx={{ width: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
          {ai ? 'AI VOICE' : 'LIVE CALL'}
        </Typography>
        <CallWave active={active} color={ai ? '#10b981' : '#6366f1'} />
      </Box>
    </Stack>
  );
}
