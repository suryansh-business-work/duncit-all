import type { ReactNode } from 'react';
import { Avatar, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import HomeIcon from '@mui/icons-material/Home';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { alpha } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { ScannedAttendee } from '../types';

const formatWhen = (value: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};

interface RowProps {
  icon: ReactNode;
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
    <Stack direction="row" spacing={1} sx={{
      alignItems: "flex-start"
    }}>
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
  /** True while the group's details are still being collected — nobody is
   * marked yet, and the chip must not claim otherwise. */
  pending?: boolean;
  ticketCode?: string;
  /** People this one ticket admits — a group booking scans once. */
  seats?: number;
}

type PresenceColor = 'success' | 'default' | 'warning';

/** Who just walked in: photo, name, how many people the ticket admits, every
 * contact detail on file, and a link to their full profile. */
export default function ScannedAttendeeCard({
  attendee,
  alreadyCheckedIn,
  pending = false,
  ticketCode,
  seats = 1,
}: Readonly<Props>) {
  const { labels, onViewProfile } = useHostPodActionsConfig();
  const joined = formatWhen(attendee.joined_at);
  // One QR can admit a whole group, so the head count is the first thing the
  // host needs at the door — it decides how many people walk past them.
  const partyText = seats === 1 ? labels.personOnTicket : labels.peopleOnTicket;
  // A ticket awaiting its companions has marked NOBODY — the old chip said
  // "Marked present" here, which made the broken second step look done.
  let presenceLabel = 'Marked present';
  let presenceColor: PresenceColor = 'success';
  if (pending) {
    presenceLabel = labels.notMarkedYet;
    presenceColor = 'warning';
  } else if (alreadyCheckedIn) {
    presenceLabel = 'Already present';
    presenceColor = 'default';
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <Avatar src={attendee.profile_photo || undefined} sx={{ width: 64, height: 64 }}>
          {attendee.full_name.slice(0, 1).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
            {attendee.full_name}
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              mt: 0.5
            }}>
            <Chip size="small" color={presenceColor} label={presenceLabel} />
            {attendee.city && <Chip size="small" variant="outlined" label={attendee.city} />}
            {ticketCode && <Chip size="small" variant="outlined" label={ticketCode} />}
          </Stack>
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={1.5}
        data-testid="scan-party-size"
        sx={{
          alignItems: "center",
          p: 1.25,
          borderRadius: '16px',
          border: '2px solid',
          borderColor: 'primary.main',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12)
        }}>
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
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
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
        {attendee.address && (
          <DetailRow icon={<HomeIcon fontSize="small" />} value={attendee.address} />
        )}
        {joined && (
          <DetailRow icon={<EventAvailableIcon fontSize="small" />} value={`Joined ${joined}`} />
        )}
      </Stack>

      <DuncitButton
        variant="outlined"
        size="small"
        endIcon={<OpenInNewIcon />}
        onClick={() => onViewProfile(attendee.profile_path)}
        sx={{ alignSelf: 'flex-start', borderRadius: 999, fontWeight: 700 }}
      >
        View profile
      </DuncitButton>
    </Stack>
  );
}
