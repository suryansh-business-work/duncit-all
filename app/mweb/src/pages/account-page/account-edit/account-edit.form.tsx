import { useEffect, useMemo, useState } from 'react';
import { useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { usernameBlocksSave, type ContactSnapshot, type UsernameStatus } from '@duncit/utils';
import RhfTextField from '../../../forms/components/RhfTextField';
import AddressFields, { type AddressFieldNames } from '../../../forms/components/AddressFields';
import { UsernameField } from '../username-field';
import DobDateField from './DobDateField';
import LocationSelect from './LocationSelect';
import { ContactSection } from '../contact-change';
import { makeAccountEditSchema, type AccountEditValues } from './account-edit.types';
import { useDateFormat, useMinSignupAge } from '../../../utils/dateFormat';
import { useTranslation } from '../../../i18n/useTranslation';

const ADDRESS_NAMES: AddressFieldNames<AccountEditValues> = {
  line1: 'address_line1',
  line2: 'address_line2',
  landmark: 'address_landmark',
  city: 'address_city',
  state: 'address_state',
  pincode: 'address_pincode',
  country: 'address_country',
};

interface Props {
  defaultValues: AccountEditValues;
  /**
   * Email, phone and WhatsApp as the account holds them.
   *
   * Separate from `defaultValues` because they are not fields of this form:
   * they are rendered read-only and changed on their own, each behind a
   * one-time code, so nothing about them rides this form's Save.
   */
  contacts: ContactSnapshot;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AccountEditValues) => Promise<void> | void;
  /** Notifies the parent dialog when there are unsaved changes (for the close guard). */
  onDirtyChange?: (dirty: boolean) => void;
  /** Lets the parent revert the form to its loaded values (discard-on-close). */
  onRegisterReset?: (reset: () => void) => void;
  /**
   * Told when a contact detail is proved and stored.
   *
   * Contacts do NOT ride this form's Save: each is its own verified write, so
   * it has already landed by the time this fires. The parent refetches on it.
   */
  onContactChanged?: () => void;
}

/**
 * Edit-profile form — React Hook Form + Zod (rule 10), MUI only. Validates
 * inline as the user types and keeps Save disabled until a valid change is made.
 * Twin of the mobile app's <AccountEditForm/> so both surfaces stay identical.
 */
export default function AccountEditForm({
  defaultValues,
  contacts,
  loading,
  errorMessage,
  onSubmit,
  onDirtyChange,
  onRegisterReset,
  onContactChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Mirrored into state so a proved change shows on the row immediately,
  // rather than only once the parent's refetch comes back.
  const [contactSnapshot, setContactSnapshot] = useState<ContactSnapshot>(contacts);
  // The handle is checked against the server, which no Zod rule can wait for,
  // so its verdict is held here and ANDed into the one Save button below.
  const [handleStatus, setHandleStatus] = useState<UsernameStatus>('IDLE');
  // The joining age is admin-configured, so the schema is built from it.
  const minAge = useMinSignupAge();
  const { datePlaceholder } = useDateFormat();
  const schema = useMemo(
    () => makeAccountEditSchema(minAge, defaultValues.dob, datePlaceholder, t),
    [minAge, defaultValues.dob, datePlaceholder, t],
  );
  const {
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty, isValid },
  } = useForm<AccountEditValues, any, AccountEditValues>({
    defaultValues,
    resolver: zodResolver(schema) as unknown as Resolver<AccountEditValues, any, AccountEditValues>,
    mode: 'onChange',
  });

  const discard = () => reset(defaultValues);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onRegisterReset?.(discard);
  });

  const handleBlocked = usernameBlocksSave(handleStatus, !!defaultValues.username);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('mweb.account.couldNotSaveProfile2'));
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        {(submitError || errorMessage) && <Alert severity="error">{submitError || errorMessage}</Alert>}
        <UsernameField
          control={control}
          current={defaultValues.username || null}
          onStatusChange={setHandleStatus}
        />
        <Stack direction="row" spacing={1}>
          <RhfTextField
            control={control}
            name="first_name"
            label={t('mweb.common.firstName')}
            required
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <RhfTextField
            control={control}
            name="last_name"
            label={t('mweb.common.lastName')}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        <RhfTextField
          control={control}
          name="bio"
          label={t('mweb.common.bio')}
          hint="Up to 500 characters"
          multiline
          minRows={2}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <DobDateField control={control} minAge={minAge} />
        <LocationSelect control={control} setValue={setValue} />
        <ContactSection
          snapshot={contactSnapshot}
          onChanged={(_channel, next) => {
            setContactSnapshot(next);
            onContactChanged?.();
          }}
        />
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            fontWeight: 700
          }}>
          Main address
        </Typography>
        <AddressFields
          control={control}
          names={ADDRESS_NAMES}
          size="small"
          shrinkLabels
          pincodeHint="6-digit PIN code"
        />
        <Stack direction="row" spacing={1}>
          <DuncitButton
            type="button"
            variant="outlined"
            color="inherit"
            onClick={discard}
            disabled={loading || !isDirty}
            data-testid="account-edit-discard"
          >
            Discard changes
          </DuncitButton>
          <DuncitButton
            type="submit"
            variant="contained"
            disabled={loading || !isDirty || !isValid || handleBlocked}
          >
            {loading ? 'Saving…' : 'Save'}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}

export type { AccountEditValues } from './account-edit.types';
