import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack, useTheme } from 'tamagui';

import { TextField } from '@/components/TextField';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { loginDefaults, makeLoginSchema, type LoginFormValues } from './login.types';

/** The portal's round submit button. */
const SUBMIT_SIZE = 56;

interface Props {
  onSubmit: (values: LoginFormValues) => Promise<void>;
}

/** The portal login card's form: e-mail and password pills, "Forgot password?", and the round ink submit. */
export function LoginForm({ onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotHint, setForgotHint] = useState(false);
  const resolver = useMemo(() => formResolver<LoginFormValues>(makeLoginSchema(t)), [t]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { control, handleSubmit, formState } = useForm<LoginFormValues, any, LoginFormValues>({
    defaultValues: loginDefaults,
    resolver,
    mode: 'onTouched',
  });
  const busy = formState.isSubmitting;

  return (
    <YStack gap="$3">
      <TextField
        control={control}
        name="email"
        label={t('session.login.email')}
        variant="pill"
        icon="alternate-email"
        keyboardType="email-address"
        autoComplete="email"
        testID="login-email"
      />
      <TextField
        control={control}
        name="password"
        label={t('session.login.password')}
        variant="pill"
        icon="lock-outline"
        secure={!showPassword}
        autoComplete="password"
        testID="login-password"
        trailing={
          <XStack
            role="button"
            aria-label={t('session.login.togglePassword')}
            aria-pressed={showPassword}
            onPress={() => setShowPassword((v) => !v)}
            padding="$2"
            hitSlop={6}
            testID="login-toggle-password"
          >
            <MaterialIcons
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color={theme.muted?.val}
            />
          </XStack>
        }
      />
      <Text
        role="button"
        color="$muted"
        fontSize="$3"
        fontWeight="600"
        alignSelf="flex-start"
        onPress={() => setForgotHint(true)}
        testID="go-forgot-password"
      >
        {t('session.login.forgotPassword')}
      </Text>
      {forgotHint ? (
        <Text color="$muted" fontSize="$2" role="status" testID="forgot-password-hint">
          {t('session.login.forgotPasswordHint')}
        </Text>
      ) : null}
      <XStack alignItems="center" gap="$3">
        <Text flex={1} color="$muted" fontSize="$2">
          {t('session.login.authorizedOnly')}
        </Text>
        <XStack
          role="button"
          aria-label={t('session.login.submit')}
          aria-busy={busy}
          aria-disabled={busy}
          disabled={busy}
          onPress={handleSubmit(onSubmit)}
          width={SUBMIT_SIZE}
          height={SUBMIT_SIZE}
          borderRadius={RADII.pill}
          backgroundColor="$ink"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.85 }}
          testID="login-submit"
        >
          {busy ? (
            <Spinner color="$onInk" />
          ) : (
            <MaterialIcons name="arrow-forward" size={24} color={theme.onInk?.val} />
          )}
        </XStack>
      </XStack>
    </YStack>
  );
}
