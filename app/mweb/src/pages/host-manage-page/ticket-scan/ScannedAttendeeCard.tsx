import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import HomeIcon from '@mui/icons-material/Home';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { alpha } from '@mui/material/styles';
import { useTranslation } from '../../../i18n/useTranslation';
import type { ScannedAttendee } from './queries';

const formatWhen = (value: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};

interface RowProps {
  icon: React.ReactNode;
  value: string;
  href?: string;
}

/** One contact line. Rendered only when the attendee actually has the field. */
function DetailRow({ icon, value, href }: Readonly<RowProps>) {
  const text = (
    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
      {value}
    </Typography>
  );
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ color: 'text.secondary', display: 'flex', pt: 0.25 }}>{icon}</Box>
      {href ? (
        <Box component="a" href={href} sx={{ color: 'primary.main', textDecoration: 'none' }}>
          {text}
        </Box>
      ) : (
        text
      )}
    </Stack>
  );
}

interface Props {
  attendee: ScannedAttendee;
  alreadyCheckedIn: boolean;
  ticketCode?: string;
  /** People this one ticket admits — a group booking scans once. */
  seats?: number;
}

/** Who just walked in: photo, name, how many people the ticket admits, every
 * contact detail on file, and a link to their full profile. */
export default function ScannedAttendeeCard({
  attendee,
  alreadyCheckedIn,
  ticketCode,
  seats = 1,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const joined = formatWhen(attendee.joined_at);
  // One QR can admit a whole group, so the head count is the first thing the
  // host needs at the door — it decides how many people walk past them.
  const partyText =
    seats === 1 ? t('mweb.hostScan.personOnTicket') : t('mweb.hostScan.peopleOnTicket');
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={attendee.profile_photo || undefined} sx={{ width: 64, height: 64 }}>
          {attendee.full_name.slice(0, 1).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
            {attendee.full_name}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color={alreadyCheckedIn ? 'default' : 'success'}
              label={alreadyCheckedIn ? 'Already present' : 'Marked present'}
            />
            {attendee.city && <Chip size="small" variant="outlined" label={attendee.city} />}
            {ticketCode && <Chip size="small" variant="outlined" label={ticketCode} />}
          </Stack>
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        data-testid="scan-party-size"
        sx={{
          p: 1.25,
          borderRadius: '16px',
          border: '2px solid',
          borderColor: 'primary.main',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            flex: '0 0 auto',
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          {seats}
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {partyText}
        </Typography>
      </Stack>

      {attendee.bio && (
        <Typography variant="body2" color="text.secondary">
          {attendee.bio}
        </Typography>
      )}

      <Divider />

      <Stack spacing={1}>
        {attendee.email && (
          <DetailRow
            icon={<EmailIcon fontSize="small" />}
            value={attendee.email}
            href={`mailto:${attendee.email}`}
          />
        )}
        {attendee.phone && (
          <DetailRow
            icon={<PhoneIcon fontSize="small" />}
            value={attendee.phone}
            href={`tel:${attendee.phone.replace(/\s/g, '')}`}
          />
        )}
        {attendee.whatsapp && (
          <DetailRow icon={<WhatsAppIcon fontSize="small" />} value={attendee.whatsapp} />
        )}
        {attendee.address && <DetailRow icon={<HomeIcon fontSize="small" />} value={attendee.address} />}
        {joined && (
          <DetailRow icon={<EventAvailableIcon fontSize="small" />} value={`Joined ${joined}`} />
        )}
      </Stack>

      <Button
        component={RouterLink}
        to={attendee.profile_path}
        variant="outlined"
        size="small"
        endIcon={<OpenInNewIcon />}
        sx={{ alignSelf: 'flex-start', borderRadius: 999, fontWeight: 700 }}
      >
        View profile
      </Button>
    </Stack>
  );
}
