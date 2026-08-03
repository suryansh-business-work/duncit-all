import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Autocomplete, Avatar, CircularProgress, Stack, TextField, Typography } from '@mui/material';
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

/** Server-side searchable picker to assign ONE platform user as the Club Admin.
 * A club has a single admin, so this is a single-select: picking a user replaces
 * whoever was there. Seeds the labelled option from the club's pre-assigned
 * admin (initialAdmins) so it is named immediately. */
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

  // Re-seed the labelled option when a different club's pre-assigned admin arrives.
  useEffect(() => {
    setChosen(seed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  // An older club may carry more than one admin id. Trim it to the first so the
  // one shown in the picker is exactly the one a save writes back — a value the
  // field cannot display must not survive a submit.
  useEffect(() => {
    if (adminIds.length > 1) setValue('admin_user_ids', [adminIds[0]]);
  }, [adminIds, setValue]);

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

  // The assigned id as a labelled option, falling back to an id-only
  // placeholder — never drop the id here (that would delete the assigned admin).
  // Memoised: MUI resets the input text whenever `value` changes identity, so a
  // fresh object every render would re-run that on each one.
  const selectedId = adminIds[0];
  const value = useMemo(
    () => (selectedId ? options.find((user) => user.user_id === selectedId) ?? { user_id: selectedId } : null),
    [options, selectedId],
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <AdminPanelSettingsIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">Club Admin</Typography>
      </Stack>

      <Alert severity="info">
        The assigned user can manage this club&apos;s pods from the Duncit app. Search by name, email or phone.
      </Alert>

      <Autocomplete
        options={options}
        value={value}
        loading={loading}
        filterOptions={(opts) => opts}
        getOptionLabel={userLabel}
        isOptionEqualToValue={(option, val) => option.user_id === val.user_id}
        inputValue={input}
        onInputChange={(_, next) => setInput(next)}
        onChange={(_, next) => {
          setChosen(next ? [next] : []);
          setValue('admin_user_ids', next ? [next.user_id] : []);
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
        renderInput={(params) => (
          <TextField
            {...params}
            label="Assign Club Admin"
            placeholder="Search users…"
            helperText="Optional — one user administers this club. Picking another replaces the current one."
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
