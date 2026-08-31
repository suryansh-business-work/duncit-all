import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { ADMINS, GRANT_ADMIN, REVOKE_ADMIN, SEARCH_USERS } from './queries';
import { useTranslation } from '@duncit/shell';

const ROOT_ADMIN_EMAIL = 'admin@duncit.com';
const label = (u: any) => u.full_name || u.email || 'Unnamed user';

export default function SuperAdminsManager() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<any>(ADMINS, { fetchPolicy: 'cache-and-network' });
  const [search, setSearch] = useState('');
  const { data: found, loading: searching } = useQuery<any>(SEARCH_USERS, {
    variables: { search },
    skip: search.trim().length < 2,
  });
  const [grant] = useMutation<any>(GRANT_ADMIN);
  const [revoke] = useMutation<any>(REVOKE_ADMIN);
  const confirm = useConfirm();

  const admins = data?.users ?? [];
  const adminIds = useMemo(() => new Set(admins.map((a: any) => a.user_id)), [admins]);
  const options = (found?.users ?? []).filter((u: any) => !adminIds.has(u.user_id));

  const addAdmin = async (u: any) => {
    try {
      await grant({ variables: { user_id: u.user_id } });
      notifySuccess(`${label(u)} is now an admin — a welcome email was sent.`);
      setSearch('');
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const removeAdmin = async (u: any) => {
    const ok = await confirm({
      title: t('admin.roles.revokeAccess'),
      message: t('admin.roles.revokeMessage', { vars: { name: label(u) } }),
      destructive: true,
      confirmLabel: t('admin.roles.revoke'),
    });
    if (!ok) return;
    try {
      await revoke({ variables: { user_id: u.user_id } });
      notifySuccess('Admin access revoked — a notification email was sent.');
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            mb: 1.5
          }}>
          <AdminPanelSettingsIcon color="primary" />
          <Box>
            <Typography variant="h6">{t('admin.roles.superAdmins')}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Admins have full access to every Duncit console. Grant carefully.
            </Typography>
          </Box>
        </Stack>

        <Alert severity="warning" sx={{ mb: 2 }}>
          Never share your admin account. Each admin should sign in with their own login.
        </Alert>

        <Autocomplete
          options={options}
          loading={searching}
          value={null}
          blurOnSelect
          clearOnBlur
          getOptionLabel={(o: any) => `${label(o)} · ${o.email || 'no email'}`}
          isOptionEqualToValue={(o: any, v: any) => o.user_id === v.user_id}
          filterOptions={(x) => x}
          onInputChange={(_e, v) => setSearch(v)}
          onChange={(_e, v) => v && addAdmin(v)}
          noOptionsText={search.trim().length < 2 ? 'Type at least 2 characters' : 'No users found'}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('admin.roles.searchUser')}
              placeholder={t('admin.roles.typeMore')}
              slotProps={{
                ...params.slotProps,

                input: {
                  ...params.slotProps.input,
                  endAdornment: (
                    <>
                      {searching ? <CircularProgress size={16} /> : null}
                      {params.slotProps.input.endAdornment}
                    </>
                  ),
                }
              }}
            />
          )}
        />

        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {loading && admins.length === 0 ? <CircularProgress size={20} /> : null}
          {admins.map((a: any) => {
            const root = (a.email || '').toLowerCase() === ROOT_ADMIN_EMAIL;
            return (
              <Chip
                key={a.user_id}
                avatar={<Avatar>{label(a)[0]?.toUpperCase()}</Avatar>}
                label={root ? `${label(a)} · root` : label(a)}
                color={root ? 'default' : 'primary'}
                variant={root ? 'filled' : 'outlined'}
                onDelete={root ? undefined : () => removeAdmin(a)}
              />
            );
          })}
          {!loading && admins.length === 0 ? (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              No admins yet.
            </Typography>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
