import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

/**
 * Which Duncit account a record belongs to.
 *
 * Searched SERVER-side through `usersTable` rather than by pulling every user
 * and filtering in the browser: the owner of a venue or the person behind a host
 * record is one account out of the whole user base, and a client-side filter
 * over that is a page that gets slower every week.
 *
 * Shared by every console editor that creates a record on somebody's behalf —
 * `onPicked` is where each one copies whatever contact details it denormalises,
 * which is the only part that differs (rule 34).
 */
export const ACCOUNT_CANDIDATES = gql`
  query ConsoleAccountCandidates($query: TableQueryInput) {
    usersTable(query: $query) {
      total
      rows {
        user_id
        full_name
        email
        phone_number
      }
    }
  }
`;

export interface AccountCandidate {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

const PAGE = 20;

const accountLabel = (account: AccountCandidate) =>
  [account.full_name, account.email ?? account.phone_number].filter(Boolean).join(' · ');

export interface AccountPickerProps<T extends FieldValues> {
  control: Control<T>;
  /** The form field holding the chosen account's id. */
  name: Path<T>;
  label: string;
  hint: string;
  /** Copy whatever contact details this record denormalises. */
  onPicked: (account: AccountCandidate) => void;
}

export default function AccountPicker<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  onPicked,
}: Readonly<AccountPickerProps<T>>) {
  const [search, setSearch] = useState('');

  const { data, loading } = useQuery<{ usersTable: { rows: AccountCandidate[] } }>(
    ACCOUNT_CANDIDATES,
    {
      variables: { query: { page: 1, page_size: PAGE, search } },
      fetchPolicy: 'cache-and-network',
    },
  );
  const options = data?.usersTable?.rows ?? [];

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const chosen = options.find((account) => account.user_id === field.value) ?? null;
        return (
          <Stack spacing={0.5}>
            <Autocomplete
              options={options}
              loading={loading}
              value={chosen}
              // The server already searched; filtering the page again would hide
              // rows it deliberately returned.
              filterOptions={(all) => all}
              getOptionLabel={accountLabel}
              isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
              onInputChange={(_event, next) => setSearch(next)}
              onChange={(_event, account) => {
                field.onChange(account?.user_id ?? '');
                if (account) onPicked(account);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={label}
                  size="small"
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? ' '}
                />
              )}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {hint}
            </Typography>
          </Stack>
        );
      }}
    />
  );
}
