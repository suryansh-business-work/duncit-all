import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Autocomplete, Avatar, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useClubFormData } from '../context';
import { CLUB_ADMIN_CANDIDATES } from '../queries';
import type { ClubFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface UserOption {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  profile_photo?: string | null;
}

const userLabel = (user: UserOption) => user.full_name || user.email || user.user_id;

/** Server-side searchable picker to assign ONE platform user as the Club Admin.
 * A club has exactly one admin, so this is a required single-select: picking a
 * user replaces whoever was there. Seeds the labelled option from the club's
 * pre-assigned admin (initialAdmins) so it is named immediately. */
export default function AdminsSection() {
  const { t } = useTranslation();
  const { initialAdmins } = useClubFormData();
  const { control, setValue } = useFormContext<ClubFormValues>();
  const { errors } = useFormState({ control });
  const error = errors.admin_user_ids?.message;
  const adminIds = useWatch({ control, name: 'admin_user_ids' }) ?? [];
  // The club's own taxonomy — the picker is narrowed to Club Admins onboarded
  // under it, which is what stops a club being handed to an admin approved for
  // an unrelated category.
  //
  // A club stores Super + SUB: its Sub is what `category_id` holds, and the
  // middle Category level is a navigation step in the picker rather than a
  // stored field. Sending it as `category_id` would match one level too wide.
  const superCategoryId = useWatch({ control, name: 'super_category_id' });
  const subCategoryId = useWatch({ control, name: 'category_id' });
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

  // The co-admins that trim is about to discard. Saving does not just unassign
  // them: the server revokes their CLUB_ADMIN role too when they administer no
  // other club, so the admin gets told before it happens rather than after.
  //
  // Matched by id, never by position: initialAdmins comes from `club_admins`,
  // which the server resolves with an unsorted `$in` lookup, so its order says
  // nothing about which id the trim above keeps.
  const keptId = adminIds[0];
  const droppedAdmins = initialAdmins.filter((admin) => admin.id !== keptId);

  useEffect(() => {
    const id = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  // Narrowed to this club's category. A Club Admin is approved against the
  // Super > Category > Sub they chose at onboarding, so offering the whole
  // CLUB_ADMIN directory let a club be handed to an admin from an unrelated
  // one. The server matches at whatever level the club has filled in, and
  // returns everyone while it has none — so the picker still works before a
  // category is chosen rather than looking broken.
  const { data, loading } = useQuery<any>(CLUB_ADMIN_CANDIDATES, {
    variables: {
      super_category_id: superCategoryId || undefined,
      sub_category_id: subCategoryId || undefined,
      search: term || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });
  const results = (data?.clubAdminCandidates ?? []) as UserOption[];

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
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <AdminPanelSettingsIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">{t('clubForm.common.clubAdmin')}</Typography>
      </Stack>

      <Alert severity="info">
        Every club is run by exactly one Club Admin, who manages its pods from the Duncit app. Only
        users holding the Club Admin role are listed — search by name, email or phone.
      </Alert>

      {droppedAdmins.length > 0 && (
        <Alert severity="warning">
          This club was set up with more than one admin. Saving keeps only the one selected below and
          removes {droppedAdmins.map((admin) => admin.name).join(', ')} — each of them also loses the
          Club Admin role unless they administer another club.
        </Alert>
      )}

      <Autocomplete
        options={options}
        value={value}
        loading={loading}
        filterOptions={(opts) => opts}
        getOptionLabel={userLabel}
        isOptionEqualToValue={(option, val) => option.user_id === val.user_id}
        inputValue={input}
        onInputChange={(_, next) => setInput(next)}
        loadingText="Searching…"
        noOptionsText="No Club Admin users match. The role is granted by approving a Club Admin onboarding meeting, or from Users → Roles."
        onChange={(_, next) => {
          setChosen(next ? [next] : []);
          // shouldValidate: nothing registers this field with RHF, so without it
          // the required error would sit there until the next submit — every
          // other field in this form re-validates on change after a failed save.
          setValue('admin_user_ids', next ? [next.user_id] : [], { shouldValidate: true });
        }}
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.user_id}>
            <Stack direction="row" spacing={1.5} sx={{
              alignItems: "center"
            }}>
              <Avatar src={option.profile_photo ?? undefined} sx={{ width: 28, height: 28 }}>
                {userLabel(option).charAt(0).toUpperCase()}
              </Avatar>
              <Stack>
                <Typography variant="body2">{option.full_name || '—'}</Typography>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>{option.email}</Typography>
              </Stack>
            </Stack>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            required
            error={!!error}
            label={t('clubForm.adminsSection.assignClubAdmin')}
            placeholder={t('clubForm.adminsSection.searchClubAdminUsers')}
            helperText={error ?? 'One user administers this club. Picking another replaces the current one.'}
            slotProps={{
              ...params.slotProps,

              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress size={16} /> : null}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              }
            }}
          />
        )}
      />
    </Stack>
  );
}
