import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, XStack, YStack } from 'tamagui';
import {
  PASSWORD_RECOVERY_CHANNELS,
  type ContactDraft,
  type PasswordRecoveryChannel,
  type PasswordRecoveryLabels,
} from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { CountryCodeField } from '@/forms/components/CountryCodeField';
import {
  makeRecoveryLookupSchema,
  type RecoveryLookupValues,
} from '@/forms/password-recovery/password-recovery.types';
import { useTranslation } from '@/hooks/useTranslation';

interface ToggleProps {
  channel: PasswordRecoveryChannel;
  labels: PasswordRecoveryLabels;
  onChannel: (channel: PasswordRecoveryChannel) => void;
}

/** The Email | Phone picker. Hoisted, never nested (S6478). */
function ChannelToggle({ channel, labels, onChannel }: Readonly<ToggleProps>) {
  return (
    <XStack gap={8}>
      {PASSWORD_RECOVERY_CHANNELS.map((value) => {
        const active = value === channel;
        return (
          <XStack
            key={value}
            testID={`recovery-channel-${value}`}
            role="button"
            aria-label={labels.channel(value).name}
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
              {labels.channel(value).name}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}

interface Props {
  channel: PasswordRecoveryChannel;
  labels: PasswordRecoveryLabels;
  defaultValues: ContactDraft;
  busy: boolean;
  /** True when the destination typed has no account behind it. */
  notFound: boolean;
  onChannel: (channel: PasswordRecoveryChannel) => void;
  onSend: (draft: ContactDraft) => void;
}

/**
 * Step one: where should the code go? Tamagui twin of mWeb's
 * <RecoveryChannelStep/>.
 *
 * The screen REMOUNTS this per channel, because the two channels validate
 * different boxes — a resolver swapped underneath a live form leaves the
 * previous channel's errors on fields the person can no longer see.
 */
export function RecoveryChannelStep({
  channel,
  labels,
  defaultValues,
  busy,
  notFound,
  onChannel,
  onSend,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = labels.channel(channel);
  const {
    control,
    handleSubmit,
    formState: { isValid },
  } = useForm<RecoveryLookupValues, any, RecoveryLookupValues>({
    defaultValues,
    resolver: zodResolver(makeRecoveryLookupSchema(channel, t)) as unknown as Resolver<
      RecoveryLookupValues,
      any,
      RecoveryLookupValues
    >,
    mode: 'onChange',
  });

  const submit = handleSubmit(onSend);

  return (
    <YStack gap={12}>
      <ChannelToggle channel={channel} labels={labels} onChannel={onChannel} />

      <Text fontSize={13} color="$muted">
        {copy.hint}
      </Text>

      {channel === 'PHONE' ? (
        <XStack gap={12} alignItems="flex-end">
          <YStack width={120}>
            <CountryCodeField
              control={control}
              name="extension"
              label={t('mweb.common.code')}
              testID="recovery-code"
            />
          </YStack>
          <YStack flex={1}>
            <FormTextField
              control={control}
              name="number"
              label={copy.fieldLabel}
              placeholder={copy.placeholder}
              keyboardType="phone-pad"
              digitsOnly
              maxLength={15}
              required
            />
          </YStack>
        </XStack>
      ) : (
        <FormTextField
          control={control}
          name="email"
          label={copy.fieldLabel}
          placeholder={copy.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          required
        />
      )}

      {notFound ? (
        <Text fontSize={13} color="$danger" testID="recovery-not-found">
          {labels.notFound}
        </Text>
      ) : null}

      <PrimaryButton
        testID="recovery-send-code"
        label={busy ? labels.sending : labels.sendCode}
        loading={busy}
        disabled={busy || !isValid}
        onPress={submit}
      />
    </YStack>
  );
}
