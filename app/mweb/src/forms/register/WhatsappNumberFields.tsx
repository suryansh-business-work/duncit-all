import type { Control, FieldValues, Path } from 'react-hook-form';
import { Stack } from '@mui/material';
import { buildSignupStepperLabels } from '@duncit/utils';
import CountryCodeField from '../components/CountryCodeField';
import RhfCheckbox from '../components/RhfCheckbox';
import RhfTextField from '../components/RhfTextField';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Where the three boxes live in the form this row is bound to.
 *
 * Passed rather than assumed because two different forms render this row — the
 * email signup, whose values also carry a name, an email and a password, and
 * the Google door's number step, whose values are only these three.
 */
export interface WhatsappNumberNames<T extends FieldValues> {
  extension: Path<T>;
  number: Path<T>;
  sameAsMobile: Path<T>;
}

interface Props<T extends FieldValues> {
  control: Control<T>;
  names: WhatsappNumberNames<T>;
}

const numberInput = { inputMode: 'numeric' as const, maxLength: 15 };

/**
 * The WhatsApp row: dial code, number, and whether it is the mobile number too.
 *
 * Named for WhatsApp rather than "phone" because a code is sent to it — the
 * label has to explain why the number is being asked for. The tick box is the
 * only thing that decides whether a phone number is written to the profile at
 * all: unticked, the profile phone is left blank on purpose, because the person
 * has said their mobile is a different number and filing this one as it would
 * put a number they never gave us on their account.
 *
 * Its native twin is app/mobile-app/src/forms/signup/WhatsappNumberFields.tsx.
 */
export default function WhatsappNumberFields<T extends FieldValues>({
  control,
  names,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <CountryCodeField control={control} name={names.extension} label={t('mweb.common.code')} />
        <RhfTextField
          control={control}
          name={names.number}
          label={t('mweb.signup.whatsappLabel')}
          required
          hint={t('mweb.signup.whatsappHint')}
          placeholder={t('mweb.signup.phonePlaceholder')}
          autoComplete="tel-national"
          size="small"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: numberInput }}
          digitsOnly
        />
      </Stack>
      <RhfCheckbox
        control={control}
        name={names.sameAsMobile}
        label={labels.sameAsMobile}
        hint={labels.sameAsMobileHint}
        data-testid="signup-same-as-mobile"
      />
    </Stack>
  );
}
