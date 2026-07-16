import type { ReactNode } from 'react';
import { Avatar, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import EventIcon from '@mui/icons-material/Event';
import BadgeIcon from '@mui/icons-material/Badge';
import VerifiedIcon from '@mui/icons-material/Verified';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { Ticket } from '../../../graphql/tickets';

/** The Admin portal's user-details URL, derived from the current support origin
 * (support.duncit.com → admin.duncit.com) with a prod fallback for dev. */
function adminUserUrl(id: string): string {
  const { origin } = globalThis.location;
  const base = origin.includes('support.')
    ? origin.replace('support.', 'admin.')
    : 'https://admin.duncit.com';
  return `${base}/users/${id}`;
}

function formatJoined(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** One contact/detail row with an optional "Verified" chip. */
function DetailRow({
  icon,
  value,
  empty,
  verified,
}: Readonly<{ icon: ReactNode; value?: string | null; empty?: string; verified?: boolean }>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
      {icon}
      <Typography
        variant="body2"
        sx={{ color: value ? 'text.primary' : 'text.secondary', flex: 1 }}
        noWrap
      >
        {value || empty}
      </Typography>
      {verified && value ? (
        <Chip size="small" color="success" variant="outlined" icon={<VerifiedIcon />} label="Verified" />
      ) : null}
    </Stack>
  );
}

/** Full user details on the ticket screen — all account info + a link to the
 * Admin user-details page (Item 3). */
export default function TicketUserDetails({ user }: Readonly<{ user: Ticket['user'] }>) {
  const location = [user.city, user.state, user.country].filter(Boolean).join(', ');
  const joined = formatJoined(user.joined_at);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={user.avatar_url || undefined} sx={{ width: 48, height: 48 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ticket raised by
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          endIcon={<OpenInNewIcon />}
          component="a"
          href={adminUserUrl(user.id)}
          target="_blank"
          rel="noreferrer"
        >
          View in Admin
        </Button>
      </Stack>

      <Stack spacing={1} sx={{ mt: 1.5 }}>
        <DetailRow
          icon={<EmailIcon fontSize="small" />}
          value={user.email}
          empty="No email on file"
          verified={user.is_email_verified}
        />
        <DetailRow
          icon={<PhoneIcon fontSize="small" />}
          value={user.phone}
          empty="No phone on file"
          verified={user.is_phone_verified}
        />
        <DetailRow icon={<PlaceIcon fontSize="small" />} value={location} empty="No location set" />
        <DetailRow
          icon={<EventIcon fontSize="small" />}
          value={joined ? `Joined ${joined}` : null}
          empty="Join date unknown"
        />
        <DetailRow icon={<BadgeIcon fontSize="small" />} value={`User ID ${user.id}`} />
      </Stack>
    </Paper>
  );
}
