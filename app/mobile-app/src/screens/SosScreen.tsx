import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, TextArea, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { PodPicker } from '@/components/support-live';
import { StackScreen } from '@/components/StackScreen';
import { useBouncer, type ActiveSos } from '@/hooks/useBouncer';
import { useSupportPods } from '@/hooks/useSupportPods';
import { toErrorMessage } from '@/utils/errors';

/** Danger SOS button with a busy spinner; disabled until a pod is selected. */
function SosSendButton({
  disabled,
  busy,
  onSend,
}: Readonly<{ disabled: boolean; busy: boolean; onSend: () => void }>) {
  return (
    <XStack
      testID="sos-send"
      role="button"
      aria-label="Send SOS"
      aria-disabled={disabled}
      onPress={disabled ? undefined : onSend}
      height={52}
      alignItems="center"
      justifyContent="center"
      gap={8}
      borderRadius={999}
      backgroundColor="$danger"
      opacity={disabled ? 0.6 : 1}
      pressStyle={{ opacity: 0.85 }}
    >
      {busy ? <Spinner color="white" /> : null}
      <Text fontSize={15} fontWeight="900" color="white" letterSpacing={1}>
        {busy ? 'SENDING SOS…' : 'SEND SOS'}
      </Text>
    </XStack>
  );
}

/** SOS — emergency help scoped to a live pod. RN twin of mWeb's SosContent. */
export function SosScreen() {
  const { options, selected, selectedId, setSelectedId } = useSupportPods();
  const { getActiveSos, raiseSos } = useBouncer();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveSos>(null);

  useEffect(() => {
    if (!selected) {
      setActive(null);
      return;
    }
    let on = true;
    getActiveSos(selected.podDocId)
      .then((a) => on && setActive(a))
      .catch(() => undefined);
    return () => {
      on = false;
    };
  }, [selected, getActiveSos]);

  const send = async () => {
    // The send button is disabled without a selection, so this guard is defensive.
    /* istanbul ignore next */
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await raiseSos(selected.podDocId, message);
      setMessage('');
      const a = await getActiveSos(selected.podDocId);
      setActive(a);
    } catch (e) {
      setError(toErrorMessage(e, 'Could not send SOS. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StackScreen title="SOS" testID="sos-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <PodPicker options={options} selectedId={selectedId} onChange={setSelectedId} />

        {active ? (
          <YStack
            testID="sos-active"
            padding={20}
            borderRadius={16}
            alignItems="center"
            gap={8}
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <MaterialIcons name="check-circle" size={44} color={semantic.success} />
            <Text fontSize={16} fontWeight="900" color="$color" textAlign="center">
              SOS sent. Help is on the way.
            </Text>
            <Text fontSize={12} color="$muted" textAlign="center">
              {active.status === 'ACKNOWLEDGED' ? 'Acknowledged by team' : 'Awaiting response'} —
              stay on this screen until someone reaches you.
            </Text>
          </YStack>
        ) : (
          <>
            <XStack
              testID="sos-warning"
              gap={10}
              padding={14}
              borderRadius={14}
              backgroundColor={`${semantic.error}14`}
              borderWidth={1}
              borderColor={`${semantic.error}55`}
            >
              <MaterialIcons name="warning-amber" size={20} color={semantic.error} />
              <YStack flex={1} gap={2}>
                <Text fontSize={13.5} fontWeight="900" color="$color">
                  Only tap SOS in a real emergency
                </Text>
                <Text fontSize={12} color="$muted">
                  Your live location, profile phone and pod context will be shared with the host &
                  admin.
                </Text>
              </YStack>
            </XStack>
            <TextArea
              testID="sos-message"
              value={message}
              onChangeText={setMessage}
              placeholder="Quick note (optional)"
              maxLength={500}
              backgroundColor="$surface"
              borderColor="$borderColor"
            />
            {error ? (
              <Text testID="sos-error" fontSize={13} color="$danger">
                {error}
              </Text>
            ) : null}
            <SosSendButton disabled={!selected || busy} busy={busy} onSend={() => void send()} />
          </>
        )}
      </ScrollView>
    </StackScreen>
  );
}
