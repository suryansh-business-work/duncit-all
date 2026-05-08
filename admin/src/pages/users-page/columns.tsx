import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { GridColDef } from '@mui/x-data-grid';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { initials, loginMeta } from './helpers';

interface DateFormatters {
  formatDate: (s: string) => string;
  formatDateTime: (s: string) => string;
}

export function getUsersColumns({ formatDate, formatDateTime }: DateFormatters): GridColDef[] {
  return [
    {
      field: 'full_name',
      headerName: 'User',
      flex: 1.35,
      minWidth: 260,
      renderCell: (p) => {
        const user = p.row as any;
        return (
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
            <Avatar
              src={user.profile_photo || undefined}
              sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}
            >
              {initials(user)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {user.full_name || 'Unnamed user'}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <EmailOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user.email || 'No email'}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        );
      },
    },
    {
      field: 'phone_number',
      headerName: 'Contact',
      flex: 0.9,
      minWidth: 180,
      renderCell: (p) => {
        const user = p.row as any;
        return (
          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <PhoneOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" noWrap>
                {user.phone_number || '—'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <PlaceOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {[user.city, user.zone].filter(Boolean).join(' · ') || 'No location'}
              </Typography>
            </Stack>
          </Stack>
        );
      },
    },
    {
      field: 'roles',
      headerName: 'Roles',
      flex: 1,
      minWidth: 220,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ py: 1 }}>
          {(p.value as string[])?.map((r) => (
            <Chip
              key={r}
              label={r.replace(/_/g, ' ')}
              size="small"
              variant="outlined"
              color="primary"
            />
          ))}
        </Stack>
      ),
    },
    {
      field: 'last_login_provider',
      headerName: 'Login Method',
      width: 165,
      renderCell: (p) => {
        const meta = loginMeta(p.row);
        return (
          <Stack spacing={0.35}>
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
            <Typography variant="caption" color="text.secondary">
              {p.row.last_login_at ? formatDate(p.row.last_login_at as string) : 'Not tracked yet'}
            </Typography>
          </Stack>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (p) => (
        <Chip
          label={p.value || 'ACTIVE'}
          size="small"
          color={p.value === 'ACTIVE' ? 'success' : p.value === 'SUSPENDED' ? 'error' : 'default'}
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 170,
      valueFormatter: (v) => (v ? formatDateTime(v as string) : ''),
    },
  ];
}
