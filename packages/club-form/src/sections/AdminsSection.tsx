import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Autocomplete, Avatar, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useFormContext, useWatch } from 'react-hook-form';
import { useClubFormData } from '../context';
import { USERS_PICKER } from '../queries';
import type { ClubFormValues } from '../types';

interface UserOption {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  profile_photo?: string | null;
}

const userLabel = (user: UserOption) => user.full_name || user.email || user.user_id;

/** Server-side searchable picker to assign platform users as Club Admins. Seeds
 * labelled chips from the club's pre-assigned admins (initialAdmins) so they are
 * named immediately, and never drops a selected id. */
export default function AdminsSection() {
  const { initialAdmins } = useClubFormData();
  const { control, setValue } = useFormContext<ClubFormValues>();
  const adminIds = useWatch({ control, name: 'admin_user_ids' }) ?? [];
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');

  const seed = () =>
    initialAdmins.map((admin) => ({ user_id: admin.id, full_name: admin.name, profile_photo: admin.avatar_url }));
  const [chosen, setChosen] = useState<UserOption[]>(seed);
  const seedKey = initialAdmins.map((admin) => admin.id).join(',');

  // Re-seed labelled chips when a different club's pre-assigned admins arrive.
  useEffect(() => {
    setChosen(seed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  useEffect(() => {
    const id = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  const { data, loading } = useQuery(USERS_PICKER, {
    variables: { filter: { search: term || undefined } },
    fetchPolicy: 'cache-and-network',
  });
  const results = (data?.users ?? []) as UserOption[];

  // Merge chosen + fetched so every id resolves to a labelled option.
  const options = useMemo(() => {
    const map = new Map<string, UserOption>();
    for (const user of [...chosen, ...results]) map.set(user.user_id, user);
    return [...map.values()];
  }, [chosen, results]);

  // Map every assigned id to a labelled option, falling back to an id-only
  // placeholder — never drop an id here (that would delete pre-assigned admins).
  const value = adminIds.map((id) => options.find((user) => user.user_id === id) ?? { user_id: id });

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <AdminPanelSettingsIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">Club Admins</Typography>
        <Chip size="small" label={adminIds.length} color={adminIds.length ? 'primary' : 'default'} />
      </Stack>

      <Alert severity="info">
        Assigned users can manage this club&apos;s pods from the Duncit app. Search by name, email or phone.
      </Alert>

      <Autocomplete
        multiple
        options={options}
        value={value}
        loading={loading}
        filterOptions={(opts) => opts}
        getOptionLabel={userLabel}
        isOptionEqualToValue={(option, val) => option.user_id === val.user_id}
        inputValue={input}
        onInputChange={(_, next) => setInput(next)}
        onChange={(_, next) => {
          setChosen(next);
          setValue('admin_user_ids', next.map((user) => user.user_id));
        }}
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.user_id}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar src={option.profile_photo ?? undefined} sx={{ width: 28, height: 28 }}>
                {userLabel(option).charAt(0).toUpperCase()}
              </Avatar>
              <Stack>
                <Typography variant="body2">{option.full_name || '—'}</Typography>
                <Typography variant="caption" color="text.secondary">{option.email}</Typography>
              </Stack>
            </Stack>
          </li>
        )}
        renderTags={(selected, getTagProps) =>
          selected.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return (
              <Chip
                key={option.user_id}
                {...tagProps}
                size="small"
                avatar={<Avatar src={option.profile_photo ?? undefined}>{userLabel(option).charAt(0).toUpperCase()}</Avatar>}
                label={userLabel(option)}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Assign Club Admins"
            placeholder="Search users…"
            helperText="Optional — assign one or more users to administer this club."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Stack>
  );
}
