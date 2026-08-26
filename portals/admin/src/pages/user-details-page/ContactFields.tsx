import { Controller, type Control } from 'react-hook-form';
import { Grid } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import type { EditForm } from './queries';
import { useTranslation } from '@duncit/shell';

type ExtensionName = 'phone_extension' | 'whatsapp_extension';
type NumberName = 'phone_number' | 'whatsapp_number';

const numericInput = { inputMode: 'numeric' as const, maxLength: 15 };

interface PairProps {
  control: Control<EditForm>;
  extensionName: ExtensionName;
  numberName: NumberName;
  numberLabel: string;
}

/**
 * A country code and the number beside it — one fact in two boxes.
 *
 * Module scope, not a helper inside <ContactFields/>: a component declared
 * inside another is remounted on every render of its parent, which drops focus
 * mid-typing (and trips S6478).
 */
function PhoneNumberPair({
  control,
  extensionName,
  numberName,
  numberLabel,
}: Readonly<PairProps>) {
  return (
    <>
      <Grid size={{ xs: 4, sm: 3 }}>
        <Controller
          control={control}
          name={extensionName}
          render={({ field, fieldState }) => (
            <PhoneExtensionField
              name={extensionName}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ' '}
              fullWidth
            />
          )}
        />
      </Grid>
      <Grid size={{ xs: 8, sm: 9 }}>
        <RhfTextField
          control={control}
          name={numberName}
          label={numberLabel}
          slotProps={{ htmlInput: numericInput }}
        />
      </Grid>
    </>
  );
}

interface Props {
  control: Control<EditForm>;
}

/**
 * The three fields an admin edits a person's contact details through.
 *
 * All three are optional and all three are cleared by emptying the box. That
 * is the point of this block: a phone has never been collected at signup, so
 * most accounts arrive here without one, and a required field kept the page's
 * Save button switched off for every one of them.
 *
 * No one-time code is asked for. mWeb and the native app gate these same three
 * changes behind an OTP because the person there is proving a contact is
 * theirs; an admin editing somebody else's record has already been authorised
 * by their role, and has no access to that person's inbox to answer one with.
 */
export default function ContactFields({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Grid size={12}>
        <RhfTextField
          control={control}
          name="email"
          type="email"
          label={t('shell.common.email')}
          hint={t('admin.profile.contactDirectHint')}
        />
      </Grid>
      <PhoneNumberPair
        control={control}
        extensionName="phone_extension"
        numberName="phone_number"
        numberLabel={t('admin.users.phoneNumber')}
      />
      <PhoneNumberPair
        control={control}
        extensionName="whatsapp_extension"
        numberName="whatsapp_number"
        numberLabel={t('admin.profile.whatsappNumber')}
      />
    </>
  );
}
