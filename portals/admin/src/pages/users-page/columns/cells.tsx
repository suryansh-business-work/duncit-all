import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { StatusChip } from '@duncit/ui';
import { initials } from '../helpers';
import type { UserRow } from '../queries';

export const renderUser = (u: UserRow) => (
  <Stack
    direction="row"
    spacing={1.25}
    component="span"
    sx={{
      alignItems: "center",
      minWidth: 0
    }}>
    <Avatar
      alt=""
      src={u.profile_photo || undefined}
      sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}
    >
      {initials(u)}
    </Avatar>
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" noWrap component="div" sx={{
        fontWeight: 700
      }}>
        {u.full_name || 'Unnamed user'}
      </Typography>
      <Stack
        direction="row"
        spacing={0.5}
        component="span"
        sx={{
          alignItems: "center",
          minWidth: 0
        }}>
        <EmailOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
        <Typography variant="caption" noWrap component="span" sx={{
          color: "text.secondary"
        }}>
          {u.email || 'No email'}
        </Typography>
      </Stack>
      {/* Both ways in, side by side. An account can hold a password AND a linked
          Google address, and they need not be the same address — support has to
          see which Gmail actually signs this account in. */}
      {u.google_email && (
        <Stack
          direction="row"
          spacing={0.5}
          component="span"
          sx={{
            alignItems: "center",
            minWidth: 0
          }}>
          <GoogleIcon sx={{ fontSize: 13, color: '#4285f4' }} />
          <Typography variant="caption" noWrap component="span" sx={{
            color: "text.secondary"
          }}>
            {u.google_email}
          </Typography>
        </Stack>
      )}
    </Box>
  </Stack>
);

const contactValue = (u: UserRow) => [u.city, u.zone].filter(Boolean).join(' · ') || 'No location';

export const renderContact = (u: UserRow) => (
  <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
    <Stack direction="row" spacing={0.5} component="span" sx={{
      alignItems: "center"
    }}>
      <PhoneOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
      <Typography variant="body2" noWrap component="span">
        {u.phone_number || '—'}
      </Typography>
    </Stack>
    <Stack direction="row" spacing={0.5} component="span" sx={{
      alignItems: "center"
    }}>
      <PlaceOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
      <Typography variant="caption" noWrap component="span" sx={{
        color: "text.secondary"
      }}>
        {contactValue(u)}
      </Typography>
    </Stack>
  </Box>
);

export const rolesValue = (u: UserRow) => (u.roles ?? []).map((r) => r.replaceAll('_', ' ')).join(', ');

export const renderRoles = (u: UserRow) => (
  <Stack direction="row" spacing={0.5} component="span" sx={{ overflow: 'hidden' }}>
    {(u.roles ?? []).map((r) => (
      <Chip key={r} label={r.replaceAll('_', ' ')} size="small" variant="outlined" color="primary" />
    ))}
  </Stack>
);

export const renderStatus = (u: UserRow) => (
  <StatusChip status={u.status || 'ACTIVE'} colorMap={{ ACTIVE: 'success', SUSPENDED: 'error' }} />
);
