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
import { createUserSchema, toCreateUserInput } from './create-user.form';

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

  const submit = async (values: CreateForm) => {
    setBusy(true);
    setOpError(null);
    try {
      const valid = await createUserSchema.validate(values, { abortEarly: false });
      await createUser({
        variables: {
          input: toCreateUserInput(valid),
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
              getRowHeight={() => 'auto'}
              disableRowSelectionOnClick
              onRowClick={(p) => navigate(`/users/${p.id}`)}
              sx={{
                border: 0,
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                  borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                },
                '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 800 },
                // Rows grow to fit wrapped content (e.g. users with many roles).
                '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', py: 1, minHeight: 56 },
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
        showPwd={showPwd}
        setShowPwd={setShowPwd}
        busy={busy}
        opError={opError}
        onSubmit={submit}
        roles={data?.roles ?? []}
      />
    </Stack>
  );
}
