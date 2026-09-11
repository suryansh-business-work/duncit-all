import { Box, Divider, Stack, Typography } from '@mui/material';
import AppleIcon from '@mui/icons-material/Apple';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GoogleIcon from '@mui/icons-material/Google';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitButton } from '@duncit/buttons';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

/** One label · value line of the receipt card. */
export function SuccessRow({ label, value, bold, mono }: Readonly<{ label: string; value: string; bold?: boolean; mono?: boolean }>) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" sx={{ color: bold ? 'text.primary' : 'text.secondary', fontWeight: bold ? 700 : 500 }}>
        {label}
      </Typography>
      <Typography
        variant={bold ? 'subtitle1' : 'body2'}
        sx={[{ fontWeight: bold ? 700 : 600, textAlign: 'right', overflowWrap: 'anywhere' }, mono ? { fontFamily: 'monospace' } : false]}
      >
        {value}
      </Typography>
    </Stack>
  );
}

interface PodProps {
  title: string;
  when: string;
  /** Venue charges payable at the door, already formatted — empty when none. */
  venueNote: string | null;
  onAppleWallet: () => void;
  onGoogleCalendar: () => void;
}

/** The booked pod on the confirmation: what and when, the calendar shortcuts,
 * and the venue charges still to be paid at the door. */
export function SuccessPodCard({ title, when, venueNote, onAppleWallet, onGoogleCalendar }: Readonly<PodProps>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ ...SURFACE_SX, p: 2, textAlign: 'left' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              color: 'secondary.main',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <EventAvailableIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600 }}>{title}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{when}</Typography>
          </Box>
        </Stack>
        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <DuncitButton fullWidth variant="outlined" startIcon={<AppleIcon />} onClick={onAppleWallet}>
            {t('mweb.checkout.appleWallet')}
          </DuncitButton>
          <DuncitButton fullWidth variant="outlined" startIcon={<GoogleIcon />} onClick={onGoogleCalendar}>
            {t('mweb.checkout.googleWallet')}
          </DuncitButton>
        </Stack>
        {venueNote && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <StorefrontIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {venueNote}
            </Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
