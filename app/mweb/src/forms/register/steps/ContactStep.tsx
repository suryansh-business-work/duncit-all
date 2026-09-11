import { Stack } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import type { Control } from 'react-hook-form';
import { WHATSAPP_NUMBER_NAMES } from '@duncit/forms/schemas';
import {
  buildSignupStepperLabels,
  signupContactLines,
  type SignupContactStatus,
} from '@duncit/utils';
import RhfTextField from '../../components/RhfTextField';
import { useTranslation } from '../../../i18n/useTranslation';
import WhatsappNumberFields from '../WhatsappNumberFields';
import { startIcon } from '../fieldProps';
import type { RegisterFormValues } from '../register.types';

interface Props {
  control: Control<RegisterFormValues>;
  /**
   * What the server says about each box as it is typed — decided by the form
   * (`useSignupEmailCheck` / `useSignupPhoneCheck`), which also gates Continue
   * on them. The step only writes the answer under the box.
   */
  emailStatus: SignupContactStatus;
  phoneStatus: SignupContactStatus;
}

/**
 * Step two — how we reach you: the WhatsApp number, then the email.
 *
 * The number leads because it is the one the last step sends a code to, so the
 * person reads what it is for before they type it, and it carries the tick box
 * that decides whether it is filed as the mobile number too — one number is
 * what most people have, and a second box nobody would fill in is worse than
 * asking the question.
 *
 * Both boxes ask the server as they are typed. "Email already in use" used to
 * be found on the code step — two screens after this one, with a code already
 * on its way — so the step cannot be left while either contact is taken.
 */
export default function ContactStep({ control, emailStatus, phoneStatus }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const emailLines = signupContactLines(emailStatus, labels.contactCopy.email);

  return (
    <Stack spacing={2}>
      <WhatsappNumberFields
        control={control}
        names={WHATSAPP_NUMBER_NAMES}
        phoneStatus={phoneStatus}
      />
      <RhfTextField
        control={control}
        name="email"
        type="email"
        label={t('mweb.auth.emailLabel')}
        required
        hint={emailLines.hint || undefined}
        errorText={emailLines.error}
        placeholder={t('mweb.signup.emailPlaceholder')}
        autoComplete="email"
        size="small"
        slotProps={{
          inputLabel: { shrink: true },
          input: startIcon(<EmailOutlinedIcon fontSize="small" />),
        }}
      />
    </Stack>
  );
}
