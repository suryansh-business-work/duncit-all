import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useDateFormat } from '../utils/dateFormat';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CasinoIcon from '@mui/icons-material/Casino';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PhoneExtensionField from '../components/PhoneExtensionField';

const STATUS_OPTIONS = ['', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];

const USERS = gql`
  query Users($filter: UsersFilter) {
    users(filter: $filter) {
      user_id
      first_name
      last_name
      full_name
      email
      phone_number
      roles
      profile_photo
      is_email_verified
      auth_providers
      last_login_provider
      last_login_at
      city
      zone
      status
      created_at
    }
    roles {
      id
      key
      name
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user_id
    }
  }
`;

interface CreateForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
  password: string;
  dob: string;
  roles: string[];
  city: string;
  zone: string;
}

const blank: CreateForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone_extension: '+91',
  phone_number: '',
  password: '',
  dob: '',
  roles: ['USER'],
  city: '',
  zone: '',
};

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function initials(user: any) {
  return `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.trim().toUpperCase() || 'U';
}

function loginMeta(user: any) {
  const provider = user.last_login_provider || (user.auth_providers?.includes('GOOGLE') ? 'GOOGLE' : 'EMAIL');
  return {
    provider,
    label: provider === 'GOOGLE' ? 'Google' : 'Email',
    icon: provider === 'GOOGLE' ? <GoogleIcon fontSize="small" /> : <EmailOutlinedIcon fontSize="small" />,
    color: provider === 'GOOGLE' ? '#4285f4' : '#0f766e',
  };
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(blank);
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const { formatDate, formatDateTime } = useDateFormat();

  const filter = useMemo(() => {
    const f: any = {};
    if (search) f.search = search;
    if (role) f.role = role;
    if (status) f.status = status;
    return Object.keys(f).length ? f : undefined;
  }, [search, role, status]);

  const { data, loading, error, refetch } = useQuery(USERS, { variables: { filter } });
  const [createUser] = useMutation(CREATE_USER);

  const openCreate = () => {
    setForm({ ...blank, password: genPassword() });
    setOpError(null);
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      await createUser({
        variables: {
          input: {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim() || undefined,
            phone_extension: form.phone_extension.trim(),
            phone_number: form.phone_number.trim(),
            password: form.password,
            dob: form.dob ? new Date(form.dob).toISOString() : undefined,
            roles: form.roles,
            city: form.city || undefined,
            zone: form.zone || undefined,
          },
        },
      });
      setOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns: GridColDef[] = [
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
            <Chip key={r} label={r.replace(/_/g, ' ')} size="small" variant="outlined" color="primary" />
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

  const validForm =
    !!form.first_name &&
    !!form.last_name &&
    !!form.phone_number &&
    form.password.length >= 8 &&
    !!form.dob &&
    form.roles.length > 0;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5">Users</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage accounts, login methods, roles and access state.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Create User
        </Button>
      </Stack>

      <Card>
        <CardContent sx={{ pb: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Any</MenuItem>
              {(data?.roles ?? []).map((r: any) => (
                <MenuItem key={r.key} value={r.key}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s || 'Any'}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: 360 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2" fontWeight={700}>
                {(data?.users ?? []).length} users found
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click a row to open details
              </Typography>
            </Stack>
          </Box>
          <Divider />
          <DataGrid
            rows={(data?.users ?? []).map((u: any) => ({ id: u.user_id, ...u }))}
            columns={columns}
            autoHeight
            getRowHeight={() => 72}
            disableRowSelectionOnClick
            onRowClick={(p) => navigate(`/users/${p.id}`)}
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
              },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 800 },
              '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
              '& .MuiDataGrid-row': { cursor: 'pointer' },
              '& .MuiDataGrid-row:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
          />
          </>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create User</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First name"
                value={form.first_name}
                onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last name"
                value={form.last_name}
                onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                helperText="Welcome email is sent if provided."
                fullWidth
              />
            </Grid>
            <Grid item xs={4} sm={3}>
              <PhoneExtensionField
                value={form.phone_extension}
                onChange={(d) => setForm((p) => ({ ...p, phone_extension: d }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={8} sm={9}>
              <TextField
                label="Phone number"
                value={form.phone_number}
                onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Date of birth"
                type="date"
                value={form.dob}
                onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Temporary password"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                helperText="Minimum 8 characters."
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Generate">
                        <IconButton
                          size="small"
                          onClick={() => setForm((p) => ({ ...p, password: genPassword() }))}
                        >
                          <CasinoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" onClick={() => setShowPwd((s) => !s)}>
                        {showPwd ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Roles"
                select
                SelectProps={{ multiple: true }}
                value={form.roles}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    roles:
                      typeof e.target.value === 'string'
                        ? [e.target.value]
                        : (e.target.value as string[]),
                  }))
                }
                fullWidth
                required
                helperText="At least one role is required."
              >
                {(data?.roles ?? []).map((r: any) => (
                  <MenuItem key={r.key} value={r.key}>
                    {r.name} ({r.key})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="City"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Zone"
                value={form.zone}
                onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))}
                fullWidth
              />
            </Grid>
            {opError && (
              <Grid item xs={12}>
                <Alert severity="error">{opError}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy || !validForm}>
            {busy ? 'Creating…' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
