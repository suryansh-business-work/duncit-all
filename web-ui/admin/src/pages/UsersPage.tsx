import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CasinoIcon from '@mui/icons-material/Casino';

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
    { field: 'full_name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    { field: 'phone_number', headerName: 'Phone', width: 140 },
    {
      field: 'roles',
      headerName: 'Roles',
      flex: 1,
      minWidth: 220,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {(p.value as string[])?.map((r) => (
            <Chip key={r} label={r} size="small" variant="outlined" color="primary" />
          ))}
        </Stack>
      ),
    },
    { field: 'city', headerName: 'City', width: 120 },
    { field: 'zone', headerName: 'Zone', width: 120 },
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
      valueFormatter: (v) => (v ? new Date(v as string).toLocaleString() : ''),
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
        <Typography variant="h5">Users</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Create User
        </Button>
      </Stack>

      <Card>
        <CardContent>
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

      <Box sx={{ height: 560, width: '100%' }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
            <CircularProgress />
          </Stack>
        ) : (
          <DataGrid
            rows={(data?.users ?? []).map((u: any) => ({ id: u.user_id, ...u }))}
            columns={columns}
            disableRowSelectionOnClick
            onRowClick={(p) => navigate(`/users/${p.id}`)}
            sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
          />
        )}
      </Box>

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
              <TextField
                label="Ext."
                value={form.phone_extension}
                onChange={(e) => setForm((p) => ({ ...p, phone_extension: e.target.value }))}
                fullWidth
                required
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
