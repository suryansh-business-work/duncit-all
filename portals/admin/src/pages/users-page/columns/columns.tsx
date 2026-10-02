import { Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { DuncitColumn } from '@duncit/table';
import { loginMeta, STATUS_OPTIONS } from '../helpers';
import type { UserRow } from '../queries';
import { renderContact, renderRoles, renderStatus, renderUser, rolesValue } from './cells';

const STATUS_FILTER_OPTIONS = STATUS_OPTIONS.filter(Boolean).map((s) => ({ value: s, label: s }));
const providerOptions = (t: ColumnDeps['t']) => [
  { value: 'GOOGLE', label: t('admin.users.google') },
  { value: 'EMAIL', label: t('shell.common.email') },
];

interface ColumnDeps {
  /** Column headings are copy — the page hands its translator down. */
  t: (key: string) => string;
  formatDate: (s: string) => string;
  formatDateTime: (s: string) => string;
  roleOptions: ReadonlyArray<{ value: string; label: string }>;
}

export function getUsersColumns({ formatDate, formatDateTime, roleOptions, t }: Readonly<ColumnDeps>): DuncitColumn<UserRow>[] {
  const renderLogin = (u: UserRow) => {
    const meta = loginMeta(u, t);
    return (
      <Stack spacing={0.25} component="span" sx={{ lineHeight: 1.2 }}>
        <Chip
          icon={meta.icon}
          label={meta.label}
          size="small"
          sx={{
            justifyContent: 'flex-start',
            // The provider colour stays on the icon and outline; the label is ink so it
            // reads at 4.5:1 in light and dark mode (WCAG 1.4.3).
            color: 'text.primary',
            borderColor: alpha(meta.color, 0.35),
            bgcolor: alpha(meta.color, 0.08),
            '& .MuiChip-icon': { color: meta.color },
          }}
          variant="outlined"
        />
        <Typography variant="caption" component="span" sx={{
          color: "text.secondary"
        }}>
          {u.last_login_at ? formatDate(u.last_login_at) : 'Not tracked yet'}
        </Typography>
      </Stack>
    );
  };
  return [
    {
      field: 'first_name',
      headerName: t('admin.users.colUser'),
      type: 'text',
      flex: 1.2,
      minWidth: 240,
      cellRenderer: renderUser,
      valueGetter: (u) => u.full_name ?? '',
    },
    {
      field: 'phone_number',
      headerName: t('admin.users.colContact'),
      type: 'text',
      minWidth: 180,
      cellRenderer: renderContact,
      valueGetter: (u) => u.phone_number ?? '',
    },
    {
      field: 'roles',
      headerName: t('admin.roles.title'),
      type: 'enum',
      options: roleOptions,
      minWidth: 200,
      cellRenderer: renderRoles,
      valueGetter: rolesValue,
    },
    {
      field: 'role',
      headerName: t('admin.users.colRole'),
      type: 'enum',
      options: roleOptions,
      hide: true,
      minWidth: 140,
      valueGetter: rolesValue,
    },
    {
      field: 'last_login_provider',
      headerName: t('admin.users.colLoginMethod'),
      type: 'enum',
      options: providerOptions(t),
      width: 170,
      cellRenderer: renderLogin,
      valueGetter: (u) => loginMeta(u, t).label,
    },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      type: 'enum',
      options: STATUS_FILTER_OPTIONS,
      width: 120,
      cellRenderer: renderStatus,
      valueGetter: (u) => u.status || 'ACTIVE',
    },
    {
      field: 'google_email',
      headerName: t('admin.users.googleAccount'),
      type: 'text',
      hide: true,
      minWidth: 220,
      valueGetter: (u) => u.google_email ?? '',
    },
    { field: 'city', headerName: t('admin.profile.city'), type: 'text', hide: true, minWidth: 130 },
    { field: 'zone', headerName: t('admin.profile.zone'), type: 'text', hide: true, minWidth: 130 },
    {
      field: 'last_login_at',
      headerName: t('admin.users.colLastLogin'),
      type: 'date',
      hide: true,
      width: 150,
      valueGetter: (u) => (u.last_login_at ? formatDate(u.last_login_at) : ''),
    },
    {
      field: 'created_at',
      headerName: t('shell.common.created'),
      type: 'date',
      width: 170,
      valueGetter: (u) => (u.created_at ? formatDateTime(u.created_at) : ''),
    },
  ];
}
