import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { OtpLoginForm } from '@/forms/otp-login';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from './AuthAlert';

interface Props {
  onRequestCode: (email: string) => Promise<boolean>;
  onSubmitCode: (email: string, code: string) => Promise<void>;
  /** The worded reason the last code step failed. */
  error: string | null;
}

function Divider({ label }: Readonly<{ label: string }>) {
  return (
    <XStack alignItems="center" gap="$2">
      <Separator />
      <Text color="$muted" fontSize="$2">
        {label}
      </Text>
      <Separator />
    </XStack>
  );
}

/**
 * The other way through the same door: collapsed under the password form until
 * asked for, as on the portal's login card, because the password is still the
 * usual way in and two open forms is a choice nobody wanted to make.
 */
export function OtpLoginPanel({ onRequestCode, onSubmitCode, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <YStack gap="$2.5">
        <Divider label={t('crmApp.otp.or')} />
        <DuncitButton
          label={t('crmApp.otp.open')}
          onPress={() => setOpen(true)}
          variant="outline"
          icon={<MaterialIcons name="mail-outline" size={18} color={theme.primary?.val} />}
          fullWidth
          testID="continue-with-otp"
        />
      </YStack>
    );
  }
  return (
    <YStack gap="$3">
      <Divider label={t('crmApp.otp.divider')} />
      {error ? <AuthAlert message={error} testID="otp-login-error" /> : null}
      <OtpLoginForm onRequestCode={onRequestCode} onSubmitCode={onSubmitCode} />
      <Text
        role="button"
        color="$muted"
        fontSize="$3"
        fontWeight="600"
        alignSelf="center"
        onPress={() => setOpen(false)}
        testID="otp-login-use-password"
      >
        {t('shell.login.usePassword')}
      </Text>
    </YStack>
  );
}
