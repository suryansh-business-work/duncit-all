import { formResolver } from '../../utils/form-resolver';
import { useMemo, useState } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { LOGIN_CHANNELS, type LoginChannel } from '@duncit/forms/schemas';

import { CountryCodeField } from '@/forms/components/CountryCodeField';
import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import {
  loginDefaults,
  makeLoginSchema,
  type LoginFormValues,
  type LoginSubmitValues,
} from './login.types';

export interface LoginFormProps {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: LoginSubmitValues) => void | Promise<void>;
}

interface ToggleProps {
  channel: LoginChannel;
  onChannel: (channel: LoginChannel) => void;
}

/** The Email | Phone picker. Hoisted, never nested (S6478). */
function ChannelToggle({ channel, onChannel }: Readonly<ToggleProps>) {
  const { t } = useTranslation();
  const nameOf = (value: LoginChannel) =>
    value === 'EMAIL' ? t('mweb.passwordRecovery.emailName') : t('mweb.passwordRecovery.phoneName');

  return (
    <XStack gap={8}>
      {LOGIN_CHANNELS.map((value) => {
        const active = value === channel;
        return (
          <XStack
            key={value}
            testID={`login-channel-${value}`}
            role="button"
            aria-label={nameOf(value)}
            onPress={() => onChannel(value)}
            pressStyle={PRESS_STYLE.inline}
            flex={1}
            height={42}
            alignItems="center"
            justifyContent="center"
            borderRadius={12}
            borderWidth={1}
            borderColor={active ? '$primary' : '$borderColor'}
            backgroundColor={active ? '$primary' : 'transparent'}
          >
            <Text fontSize={14} fontWeight="600" color={active ? '$onPrimary' : '$color'}>
              {nameOf(value)}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}

/** The destination boxes for the chosen channel. Hoisted (S6478). */
function LoginIdentityFields({
  channel,
  control,
}: Readonly<{ channel: LoginChannel; control: Control<LoginFormValues> }>) {
  const { t } = useTranslation();

  if (channel === 'PHONE') {
    return (
      <XStack gap={12} alignItems="flex-end">
        <YStack width={120}>
          <CountryCodeField
            control={control}
            name="phoneExtension"
            label={t('mweb.common.code')}
            testID="login-code"
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="phoneNumber"
            label={t('mweb.passwordRecovery.phoneField')}
            placeholder={t('mweb.passwordRecovery.phonePlaceholder')}
            keyboardType="phone-pad"
            digitsOnly
            maxLength={15}
            required
          />
        </YStack>
      </XStack>
    );
  }

  return (
    <FormTextField
      control={control}
      name="email"
      label={t('mweb.auth.emailLabel')}
      placeholder={t('mweb.auth.emailPlaceholder')}
      autoCapitalize="none"
      keyboardType="email-address"
      autoComplete="email"
      textContentType="emailAddress"
      required
    />
  );
}

/** One channel's form. Remounted by the parent when the channel changes. */
function LoginFields({
  channel,
  loading,
  errorMessage,
  onSubmit,
}: Readonly<LoginFormProps & { channel: LoginChannel }>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeLoginSchema(t, channel), [t, channel]);
  const { control, handleSubmit } = useForm<LoginFormValues, any, LoginFormValues>({
    defaultValues: loginDefaults,
    resolver: formResolver<LoginFormValues>(schema),
    mode: 'onBlur',
  });

  return (
    <YStack gap={16}>
      <LoginIdentityFields channel={channel} control={control} />
      <FormTextField
        control={control}
        name="password"
        label={t('mweb.auth.passwordLabel')}
        placeholder={t('mweb.login.passwordPlaceholder')}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        required
        hint={t('mweb.auth.passwordHint')}
      />

      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="login-error">
          {errorMessage}
        </Text>
      ) : null}

      <PrimaryButton
        testID="login-submit"
        label={t('mweb.login.submit')}
        loading={loading}
        onPress={handleSubmit((values) => onSubmit({ ...values, channel }))}
      />
    </YStack>
  );
}

/**
 * Continue with password, on either of the two things an account is identified
 * by — the mWeb twin's shape exactly (rule 27). The channel lives here rather
 * than in the form values: the two channels validate different boxes, and a
 * resolver swapped underneath a live form leaves the previous channel's errors
 * on fields nobody can see any more, so the form is REMOUNTED per channel.
 */
export function LoginForm(props: Readonly<LoginFormProps>) {
  const [channel, setChannel] = useState<LoginChannel>('EMAIL');

  return (
    <YStack gap={16}>
      <ChannelToggle channel={channel} onChannel={setChannel} />
      <LoginFields key={channel} channel={channel} {...props} />
    </YStack>
  );
}
