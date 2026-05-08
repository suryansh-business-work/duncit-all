import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import { useDateFormat } from '../../utils/dateFormat';
import { CREATE_USER, USERS } from './queries';
import { blankForm, genPassword, type CreateForm } from './helpers';
import { getUsersColumns } from './columns';
import CreateUserDialog from './CreateUserDialog';
import UsersFilters from './UsersFilters';

export default function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(blankForm);
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
    setForm({ ...blankForm, password: genPassword() });
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

  const columns = useMemo(
    () => getUsersColumns({ formatDate, formatDateTime }),
    [formatDate, formatDateTime]
  );

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

      <UsersFilters
        search={search}
        setSearch={setSearch}
        role={role}
        setRole={setRole}
        status={status}
        setStatus={setStatus}
        roles={data?.roles ?? []}
      />

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

      <CreateUserDialog
        open={open}
        onClose={() => setOpen(false)}
        form={form}
        setForm={setForm}
        showPwd={showPwd}
        setShowPwd={setShowPwd}
        busy={busy}
        validForm={validForm}
        opError={opError}
        onSubmit={submit}
        roles={data?.roles ?? []}
      />
    </Stack>
  );
}
