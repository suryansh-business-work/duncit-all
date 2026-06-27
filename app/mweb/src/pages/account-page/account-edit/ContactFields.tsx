import { useEffect, useState } from 'react';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import RhfTextField from '../../../forms/components/RhfTextField';
import CountryCodeField from './CountryCodeField';
import type { AccountEditValues } from './account-edit.types';

interface Props {
  control: Control<AccountEditValues>;
  setValue: UseFormSetValue<AccountEditValues>;
}

const numericInput = { inputMode: 'numeric' as const, maxLength: 15 };

/**
 * Contact + WhatsApp numbers with country-code dropdowns (bug 4) and a
 * "same as contact number" toggle (bug 3). While the toggle is on, the WhatsApp
 * fields mirror the contact number live and are locked from manual edits.
 */
export default function ContactFields({ control, setValue }: Readonly<Props>) {
  const phoneExtension = useWatch({ control, name: 'phone_extension' });
  const phoneNumber = useWatch({ control, name: 'phone_number' });
  const whatsappExtension = useWatch({ control, name: 'whatsapp_extension' });
  const whatsappNumber = useWatch({ control, name: 'whatsapp_number' });

  const [sameAsContact, setSameAsContact] = useState(
    () =>
      !!phoneNumber &&
      phoneNumber === whatsappNumber &&
      phoneExtension === whatsappExtension,
  );

  useEffect(() => {
    if (!sameAsContact) return;
    setValue('whatsapp_extension', phoneExtension, { shouldDirty: true, shouldValidate: true });
    setValue('whatsapp_number', phoneNumber, { shouldDirty: true, shouldValidate: true });
  }, [sameAsContact, phoneExtension, phoneNumber, setValue]);

  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary" fontWeight={900}>
        Contact number
      </Typography>
      <Stack direction="row" spacing={1}>
        <CountryCodeField control={control} name="phone_extension" label="Code" />
        <RhfTextField
          control={control}
          name="phone_number"
          label="Phone number"
          size="small"
          InputLabelProps={{ shrink: true }}
          inputProps={numericInput}
        />
      </Stack>

      <FormControlLabel
        control={
          <Checkbox
            checked={sameAsContact}
            onChange={(event) => setSameAsContact(event.target.checked)}
            inputProps={{ 'aria-label': 'WhatsApp number same as contact number' }}
          />
        }
        label="WhatsApp number same as contact number"
      />

      <Typography variant="overline" color="text.secondary" fontWeight={900}>
        WhatsApp number
      </Typography>
      <Stack direction="row" spacing={1}>
        <CountryCodeField
          control={control}
          name="whatsapp_extension"
          label="Code"
          disabled={sameAsContact}
        />
        <RhfTextField
          control={control}
          name="whatsapp_number"
          label="WhatsApp number"
          size="small"
          disabled={sameAsContact}
          InputLabelProps={{ shrink: true }}
          inputProps={numericInput}
        />
      </Stack>
    </Stack>
  );
}
