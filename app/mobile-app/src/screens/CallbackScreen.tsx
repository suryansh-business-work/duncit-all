import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, TextArea, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SupportAlert } from '@/components/support/SupportAlert';
import { useBouncer } from '@/hooks/useBouncer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toErrorMessage } from '@/utils/errors';

type SupportTarget = { phone: string; available: boolean } | null;

/** "Call support now" card — dials support directly when a phone is configured.
 * When no phone is configured the button reads as clearly disabled (muted, not
 * an active-looking red), matching mWeb's greyed-out disabled button. */
function CallNowCard({ target }: Readonly<{ target: SupportTarget }>) {
  const { onPrimary, muted } = useThemeColors();
  const disabled = !target?.available;
  const fg = disabled ? muted : onPrimary;
  return (
    <YStack
      padding={16}
      borderRadius={16}
      gap={10}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text fontSize={12} fontWeight="900" textTransform="uppercase" color="$muted">
        Call support now
      </Text>
      <Text fontSize={13} color="$muted">
        {target?.available
          ? `Dial ${target.phone}. We will answer in seconds.`
          : 'Support phone is not configured yet — please request a callback below.'}
      </Text>
      <XStack
        testID="callback-call-now"
        role="button"
        aria-label="Call now"
        aria-disabled={disabled}
        onPress={target?.available ? () => void Linking.openURL(`tel:${target.phone}`) : undefined}
        height={46}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={999}
        backgroundColor={disabled ? '$muted' : '$primary'}
        opacity={disabled ? 0.45 : 1}
        pressStyle={{ opacity: disabled ? 0.45 : 0.85 }}
      >
        <MaterialIcons name="call" size={18} color={fg} />
        <Text fontSize={14} fontWeight="800" color={fg}>
          Call Now
        </Text>
      </XStack>
    </YStack>
  );
}

/** Callback Request — call support now or request a callback. RN twin of mWeb's
 * CallbackContent. */
export function CallbackScreen() {
  const { loadSupportTarget, requestCallback } = useBouncer();
  const { primary } = useThemeColors();
  const [target, setTarget] = useState<SupportTarget>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    let on = true;
    loadSupportTarget()
      .then((d) => on && setTarget(d.bouncerSupportTarget))
      .catch(() => undefined);
    return () => {
      on = false;
    };
  }, [loadSupportTarget]);

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestCallback(null, reason);
      setReason('');
      setRequested(true);
    } catch (e) {
      setError(toErrorMessage(e, 'Could not request callback.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StackScreen title="Callback Request" testID="callback-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <CallNowCard target={target} />

        <YStack
          padding={16}
          borderRadius={16}
          gap={10}
          backgroundColor="$surface"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Text fontSize={12} fontWeight="900" textTransform="uppercase" color="$muted">
            Request a callback
          </Text>
          <Text fontSize={13} color="$muted">
            We will call you back on your registered phone number.
          </Text>
          <TextArea
            testID="callback-reason"
            value={reason}
            onChangeText={setReason}
            placeholder="What's it about? (optional)"
            maxLength={500}
            backgroundColor="$background"
            borderColor="$borderColor"
          />
          {error ? (
            <SupportAlert
              testID="callback-error"
              variant="error"
              message={error}
              onClose={() => setError(null)}
            />
          ) : null}
          {requested ? (
            <SupportAlert
              testID="callback-success"
              variant="success"
              message="Callback requested. We will reach you shortly."
              onClose={() => setRequested(false)}
            />
          ) : null}
          <XStack
            testID="callback-request"
            role="button"
            aria-label="Request callback"
            aria-disabled={busy}
            onPress={busy ? undefined : () => void request()}
            height={46}
            alignItems="center"
            justifyContent="center"
            gap={8}
            borderRadius={999}
            borderWidth={1}
            borderColor="$primary"
            opacity={busy ? 0.6 : 1}
            pressStyle={{ opacity: 0.85 }}
          >
            <MaterialIcons name="phone-callback" size={18} color={primary} />
            <Text fontSize={14} fontWeight="800" color="$primary">
              {busy ? 'Requesting…' : 'Request callback'}
            </Text>
          </XStack>
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
