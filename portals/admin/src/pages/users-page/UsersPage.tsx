import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { CREATE_USER, ROLES, USERS_TABLE, type UserRow } from './queries';
import { blankForm, genPassword, type CreateForm } from './helpers';
import { getUsersColumns } from './columns';
import CreateUserDialog from './CreateUserDialog';
import { createUserSchema, toCreateUserInput } from './create-user.form';

const getUserRowId = (u: UserRow) => u.user_id;

export default function UsersPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(blankForm);
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const { formatDate, formatDateTime } = useDateFormat();

  const { data: rolesData } = useQuery(ROLES);
  const [createUser] = useMutation(CREATE_USER);
  const roles = rolesData?.roles ?? [];

  const fetchRows = useApolloTableFetch<UserRow>(client, USERS_TABLE, 'usersTable');

  const openCreate = () => {
    setForm({ ...blankForm, password: genPassword() });
    setOpError(null);
    setOpen(true);
  };

  const submit = async (values: CreateForm) => {
    setBusy(true);
    setOpError(null);
    try {
      const valid = createUserSchema.parse(values);
      await createUser({
        variables: {
          input: toCreateUserInput(valid),
        },
      });
      setOpen(false);
      refetchRef.current?.();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(() => {
    const roleOptions = roles.map((r: any) => ({ value: r.key, label: r.name }));
    return getUsersColumns({ formatDate, formatDateTime, roleOptions });
  }, [formatDate, formatDateTime, roles]);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5">Users</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage accounts, login methods, roles and access state. Click a row to open details.
        </Typography>
      </Box>

      <DuncitTable<UserRow>
        tableId="admin-users"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getUserRowId}
        onRowClick={(u) => navigate(`/users/${u.user_id}`)}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Create User
          </Button>
        }
        emptyText="No users match the current filters."
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search name, email or phone"
        refetchRef={refetchRef}
      />

      <CreateUserDialog
        open={open}
        onClose={() => setOpen(false)}
        form={form}
        showPwd={showPwd}
        setShowPwd={setShowPwd}
        busy={busy}
        opError={opError}
        onSubmit={submit}
        roles={roles}
      />
    </Stack>
  );
}
