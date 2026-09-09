import { YStack } from 'tamagui';
import type { Control } from 'react-hook-form';
import { WHATSAPP_NUMBER_NAMES } from '@duncit/forms/schemas';
import {
  buildSignupStepperLabels,
  signupContactLines,
  type SignupContactStatus,
} from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { WhatsappNumberFields } from '../WhatsappNumberFields';
import type { SignupFormValues } from '../signup.types';

interface Props {
  control: Control<SignupFormValues>;
  /**
   * What the server says about each box as it is typed — decided by the form
   * (`useSignupEmailCheck` / `useSignupPhoneCheck`), which also gates Continue
   * on them. The step only writes the answer under the box.
   */
  emailStatus: SignupContactStatus;
  phoneStatus: SignupContactStatus;
}

/**
 * Step two — how we reach you: the WhatsApp number, then the email. Tamagui
 * twin of mWeb's <ContactStep/>.
 *
 * The number leads because it is the one the last step sends a code to, and it
 * carries the tick box that decides whether it is filed as the mobile number
 * too — one number is what most people have, and asking for a second box
 * nobody would fill in is worse than asking the question.
 *
 * Both boxes ask the server as they are typed. "Email already in use" used to
 * be found on the code step — two screens after this one, with a code already
 * on its way — so the step cannot be left while either contact is taken.
 */
export function ContactStep({ control, emailStatus, phoneStatus }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildSignupStepperLabels(t);
  const emailLines = signupContactLines(emailStatus, labels.contactCopy.email);

  return (
    <YStack gap={16}>
      <WhatsappNumberFields
        control={control}
        names={WHATSAPP_NUMBER_NAMES}
        phoneStatus={phoneStatus}
      />
      <FormTextField
        control={control}
        name="email"
        label={t('mweb.auth.emailLabel')}
        placeholder={t('mweb.signup.emailPlaceholder')}
        hint={emailLines.hint || undefined}
        errorText={emailLines.error}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        required
      />
    </YStack>
  );
}
