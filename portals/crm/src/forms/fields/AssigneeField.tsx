import { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Autocomplete, Box, CircularProgress, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { CrmStaffUser } from '../../api/crm.types';
import { useCrmStaffSearch } from '../../hooks/useCrmStaffSearch';

/** Form values this field reads and writes. */
interface AssigneeValues {
  assigned_to: string;
  assigned_user_id: string;
}

const userLabel = (user: CrmStaffUser) => user.name || user.email || user.id;

/**
 * Internal Lead Tracking › Assigned To: a searchable list of the CRM team.
 * Picking someone stores their id (`assigned_user_id`) and their name
 * (`assigned_to`, which older app versions and the listing read). A legacy
 * free-text name stays as it is until someone is picked, and is shown so the
 * user knows what the lead held.
 */
export default function AssigneeField() {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<AssigneeValues>();
  const assignedId = useWatch({ control, name: 'assigned_user_id' });
  const assignedName = useWatch({ control, name: 'assigned_to' });
  const [input, setInput] = useState('');
  const { users, loading, error } = useCrmStaffSearch(input);

  // The current assignee may not be in this page of search results; keep it selectable.
  const selected = useMemo<CrmStaffUser | null>(() => {
    if (!assignedId) return null;
    return users.find((user) => user.id === assignedId) ?? { id: assignedId, name: assignedName, roles: [], is_staff: true };
  }, [assignedId, assignedName, users]);
  const options = useMemo(
    () => (selected && !users.some((user) => user.id === selected.id) ? [selected, ...users] : users),
    [selected, users],
  );
  const legacyName = !assignedId && assignedName ? assignedName : '';

  const pick = (user: CrmStaffUser | null) => {
    const opts = { shouldDirty: true, shouldValidate: true };
    setValue('assigned_user_id', user?.id ?? '', opts);
    // Clearing the picker clears a legacy name too: the lead is then unassigned.
    setValue('assigned_to', user ? userLabel(user) : '', opts);
  };

  let helperText = t('crm.assignee.hint');
  if (error) helperText = t('crm.assignee.loadError');
  else if (legacyName) helperText = t('crm.assignee.legacy', { vars: { name: legacyName } });

  return (
    <Autocomplete<CrmStaffUser>
      size="small"
      options={options}
      value={selected}
      loading={loading}
      filterOptions={(list) => list}
      getOptionLabel={userLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, next) => pick(next)}
      onInputChange={(_, next, reason) => {
        if (reason === 'input') setInput(next);
        if (reason === 'clear') setInput('');
      }}
      noOptionsText={t('crm.assignee.noMatches')}
      loadingText={t('shell.a11y.loading')}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {userLabel(option)}
            </Typography>
            {option.email ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                {option.email}
              </Typography>
            ) : null}
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('crm.forms.assignedTo')}
          placeholder={t('crm.assignee.placeholder')}
          helperText={helperText}
          error={Boolean(error)}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={16} aria-hidden /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
            htmlInput: { ...params.slotProps.htmlInput, 'data-testid': 'assignee-input' },
          }}
        />
      )}
      data-testid="assignee-field"
    />
  );
}
