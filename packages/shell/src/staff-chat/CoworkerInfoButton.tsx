import { useState } from 'react';
import {
  Avatar,
  Chip,
  Divider,
  IconButton,
  Link,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { formatInTimeZone } from 'date-fns-tz';
import { ROLE_LABEL, type Coworker } from './queries';

interface Props {
  person: Coworker;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** What the clock says where they are, or nothing if the zone is unusable. */
function localTime(zone: string): string {
  try {
    return formatInTimeZone(new Date(), zone, 'HH:mm');
  } catch {
    // A profile can hold any string; an unknown zone is not worth an error.
    return '';
  }
}

/** One labelled fact in the card. */
function DetailRow({
  icon,
  children,
}: Readonly<{ icon: React.ReactNode; children: React.ReactNode }>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
      {icon}
      <Typography variant="caption" noWrap component="div">
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * Who you are about to write to.
 *
 * The row can only show two or three of someone's consoles before it wraps, and
 * a person with six is exactly the person you most need to identify — "which of
 * the four Rahuls runs Finance" is the question this answers. Everything they
 * have is in here, plus a way to reach them off-chat.
 */
export default function CoworkerInfoButton({ person }: Readonly<Props>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={`About ${person.name}`}>
        <IconButton
          size="small"
          edge="end"
          aria-label={`About ${person.name}`}
          onClick={(event) => {
            // The row underneath opens the conversation; this does not.
            event.stopPropagation();
            setAnchor(event.currentTarget);
          }}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack spacing={1} sx={{ p: 1.5, width: 280 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar src={person.photo || undefined} sx={{ width: 44, height: 44 }}>
              {initials(person.name)}
            </Avatar>
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                {person.name}
              </Typography>
              {person.email && (
                <Link
                  href={`mailto:${person.email}`}
                  variant="caption"
                  underline="hover"
                  color="text.secondary"
                  noWrap
                >
                  {person.email}
                </Link>
              )}
            </Stack>
          </Stack>

          {person.bio && (
            <Typography variant="caption" color="text.secondary">
              {person.bio}
            </Typography>
          )}

          {/* The three facts you actually want before contacting somebody: how
              else to reach them, where they are, and whether it is a civil hour
              there. A phone number you cannot press is a phone number you
              retype, so it is a tel: link. */}
          {person.phone && (
            <DetailRow icon={<PhoneIcon fontSize="small" />}>
              <Link href={`tel:${person.phone.replaceAll(/\s/g, '')}`} underline="hover">
                {person.phone}
              </Link>
            </DetailRow>
          )}
          {person.city && (
            <DetailRow icon={<PlaceIcon fontSize="small" />}>{person.city}</DetailRow>
          )}
          {person.timezone && (
            <DetailRow icon={<ScheduleIcon fontSize="small" />}>
              {localTime(person.timezone)} local
            </DetailRow>
          )}

          <Divider />

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {person.roles.length === 1 ? 'Console' : 'Consoles'}
          </Typography>
          {person.roles.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No staff console assigned.
            </Typography>
          ) : (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {person.roles.map((role) => (
                <Chip key={role} size="small" label={ROLE_LABEL[role] ?? role} />
              ))}
            </Stack>
          )}
        </Stack>
      </Popover>
    </>
  );
}
