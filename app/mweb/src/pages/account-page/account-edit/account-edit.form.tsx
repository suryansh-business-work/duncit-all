import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Stack } from '@mui/material';
import RhfTextField from '../../../forms/components/RhfTextField';
import type { CountryNode } from '../../../utils/location-tree';
import DobDateField from './DobDateField';
import LocationSelect from './LocationSelect';
import ContactFields from './ContactFields';
import { accountEditSchema, type AccountEditValues } from './account-edit.types';

interface Props {
  countries: CountryNode[];
  defaultValues: AccountEditValues;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AccountEditValues) => Promise<void> | void;
  /** Notifies the parent dialog when there are unsaved changes (for the close guard). */
  onDirtyChange?: (dirty: boolean) => void;
  /** Lets the parent revert the form to its loaded values (discard-on-close). */
  onRegisterReset?: (reset: () => void) => void;
}

/**
 * Edit-profile form — React Hook Form + Zod (rule 10), MUI only. Validates
 * inline as the user types and keeps Save disabled until a valid change is made.
 * Twin of the mobile app's <AccountEditForm/> so both surfaces stay identical.
 */
export default function AccountEditForm({
  countries,
  defaultValues,
  loading,
  errorMessage,
  onSubmit,
  onDirtyChange,
  onRegisterReset,
}: Readonly<Props>) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty, isValid },
  } = useForm<AccountEditValues>({
    defaultValues,
    resolver: zodResolver(accountEditSchema),
    mode: 'onChange',
  });

  const discard = () => reset(defaultValues);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onRegisterReset?.(discard);
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save profile');
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
        <Stack direction="row" spacing={1}>
          <RhfTextField
            control={control}
            name="first_name"
            label="First name"
            required
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <RhfTextField
            control={control}
            name="last_name"
            label="Last name"
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        <RhfTextField
          control={control}
          name="bio"
          label="Bio"
          multiline
          minRows={2}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <DobDateField control={control} />
        <LocationSelect control={control} setValue={setValue} countries={countries} />
        <ContactFields control={control} setValue={setValue} />
        <Stack direction="row" spacing={1}>
          <Button
            type="button"
            variant="outlined"
            color="inherit"
            onClick={discard}
            disabled={loading || !isDirty}
            data-testid="account-edit-discard"
          >
            Discard changes
          </Button>
          <Button type="submit" variant="contained" disabled={loading || !isDirty || !isValid}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}

export type { AccountEditValues } from './account-edit.types';
