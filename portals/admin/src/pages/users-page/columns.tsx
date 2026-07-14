import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import type { DuncitColumn } from '@duncit/table';
import { initials, loginMeta, STATUS_OPTIONS } from './helpers';
import type { UserRow } from './queries';

const STATUS_FILTER_OPTIONS = STATUS_OPTIONS.filter(Boolean).map((s) => ({ value: s, label: s }));
const PROVIDER_OPTIONS = [
  { value: 'GOOGLE', label: 'Google' },
  { value: 'EMAIL', label: 'Email' },
] as const;

const renderUser = (u: UserRow) => (
  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }} component="span">
    <Avatar
      src={u.profile_photo || undefined}
      sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}
    >
      {initials(u)}
    </Avatar>
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" fontWeight={700} noWrap component="div">
        {u.full_name || 'Unnamed user'}
      </Typography>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }} component="span">
        <EmailOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" noWrap component="span">
          {u.email || 'No email'}
        </Typography>
      </Stack>
    </Box>
  </Stack>
);

const contactValue = (u: UserRow) => [u.city, u.zone].filter(Boolean).join(' · ') || 'No location';

const renderContact = (u: UserRow) => (
  <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
    <Stack direction="row" spacing={0.5} alignItems="center" component="span">
      <PhoneOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
      <Typography variant="body2" noWrap component="span">
        {u.phone_number || '—'}
      </Typography>
    </Stack>
    <Stack direction="row" spacing={0.5} alignItems="center" component="span">
      <PlaceOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
      <Typography variant="caption" color="text.secondary" noWrap component="span">
        {contactValue(u)}
      </Typography>
    </Stack>
  </Box>
);

const rolesValue = (u: UserRow) => (u.roles ?? []).map((r) => r.replaceAll('_', ' ')).join(', ');

const renderRoles = (u: UserRow) => (
  <Stack direction="row" spacing={0.5} component="span" sx={{ overflow: 'hidden' }}>
    {(u.roles ?? []).map((r) => (
      <Chip key={r} label={r.replaceAll('_', ' ')} size="small" variant="outlined" color="primary" />
    ))}
  </Stack>
);

const renderStatus = (u: UserRow) => {
  const suspendedColor = u.status === 'SUSPENDED' ? 'error' : 'default';
  const statusColor = u.status === 'ACTIVE' ? 'success' : suspendedColor;
  return <Chip label={u.status || 'ACTIVE'} size="small" color={statusColor} />;
};

interface ColumnDeps {
  formatDate: (s: string) => string;
  formatDateTime: (s: string) => string;
  roleOptions: ReadonlyArray<{ value: string; label: string }>;
}

export function getUsersColumns({ formatDate, formatDateTime, roleOptions }: Readonly<ColumnDeps>): DuncitColumn<UserRow>[] {
  const renderLogin = (u: UserRow) => {
    const meta = loginMeta(u);
    return (
      <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
        <Chip
          icon={meta.icon}
          label={meta.label}
          size="small"
          sx={{
            justifyContent: 'flex-start',
            color: meta.color,
            borderColor: alpha(meta.color, 0.35),
            bgcolor: alpha(meta.color, 0.08),
            '& .MuiChip-icon': { color: meta.color },
          }}
          variant="outlined"
        />
        <Typography variant="caption" color="text.secondary" component="span">
          {u.last_login_at ? formatDate(u.last_login_at) : 'Not tracked yet'}
        </Typography>
      </Stack>
    );
  };
  return [
    {
      field: 'first_name',
      headerName: 'User',
      flex: 1.2,
      minWidth: 240,
      cellRenderer: renderUser,
      valueGetter: (u) => u.full_name ?? '',
    },
    {
      field: 'phone_number',
      headerName: 'Contact',
      sortable: false,
      minWidth: 180,
      cellRenderer: renderContact,
      valueGetter: (u) => u.phone_number ?? '',
    },
    {
      field: 'roles',
      headerName: 'Roles',
      sortable: false,
      minWidth: 200,
      cellRenderer: renderRoles,
      valueGetter: rolesValue,
    },
    {
      field: 'role',
      headerName: 'Role',
      sortable: false,
      filter: { type: 'select', options: roleOptions },
      hide: true,
      minWidth: 140,
      valueGetter: rolesValue,
    },
    {
      field: 'last_login_provider',
      headerName: 'Login Method',
      sortable: false,
      filter: { type: 'select', options: PROVIDER_OPTIONS },
      width: 170,
      cellRenderer: renderLogin,
      valueGetter: (u) => loginMeta(u).label,
    },
    {
      field: 'status',
      headerName: 'Status',
      filter: { type: 'select', options: STATUS_FILTER_OPTIONS },
      width: 120,
      cellRenderer: renderStatus,
      valueGetter: (u) => u.status || 'ACTIVE',
    },
    { field: 'city', headerName: 'City', filter: { type: 'text' }, hide: true, minWidth: 130 },
    { field: 'zone', headerName: 'Zone', filter: { type: 'text' }, hide: true, minWidth: 130 },
    {
      field: 'last_login_at',
      headerName: 'Last Login',
      filter: { type: 'date' },
      hide: true,
      width: 150,
      valueGetter: (u) => (u.last_login_at ? formatDate(u.last_login_at) : ''),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      filter: { type: 'date' },
      width: 170,
      valueGetter: (u) => (u.created_at ? formatDateTime(u.created_at) : ''),
    },
  ];
}
