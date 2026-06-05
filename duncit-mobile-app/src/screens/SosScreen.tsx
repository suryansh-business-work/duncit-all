import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, TextArea, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { PodPicker } from '@/components/support-live';
import { StackScreen } from '@/components/StackScreen';
import { useBouncer, type ActiveSos } from '@/hooks/useBouncer';
import { useSupportPods } from '@/hooks/useSupportPods';
import { toErrorMessage } from '@/utils/errors';

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
              gap={10}
              padding={14}
              borderRadius={14}
              backgroundColor="$surface"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <MaterialIcons name="warning-amber" size={20} color={semantic.error} />
              <Text flex={1} fontSize={12.5} color="$muted">
                Only tap SOS in a real emergency. Your live location, phone and pod context are
                shared with the host & admin.
              </Text>
            </XStack>
            <TextArea
              testID="sos-message"
              value={message}
              onChangeText={setMessage}
              placeholder="Quick note (optional) e.g. medical help needed"
              maxLength={500}
              backgroundColor="$surface"
              borderColor="$borderColor"
            />
            {error ? (
              <Text testID="sos-error" fontSize={13} color="$danger">
                {error}
              </Text>
            ) : null}
            <XStack
              testID="sos-send"
              role="button"
              aria-label="Send SOS"
              aria-disabled={!selected || busy}
              onPress={!selected || busy ? undefined : () => void send()}
              height={52}
              alignItems="center"
              justifyContent="center"
              gap={8}
              borderRadius={999}
              backgroundColor="$danger"
              opacity={!selected || busy ? 0.6 : 1}
              pressStyle={{ opacity: 0.85 }}
            >
              {busy ? <Spinner color="white" /> : null}
              <Text fontSize={15} fontWeight="900" color="white" letterSpacing={1}>
                {busy ? 'SENDING SOS…' : 'SEND SOS'}
              </Text>
            </XStack>
          </>
        )}
      </ScrollView>
    </StackScreen>
  );
}
