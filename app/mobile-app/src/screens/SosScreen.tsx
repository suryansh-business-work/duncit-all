import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, TextArea, XStack, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import { PodPicker } from '@/components/support-live';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBouncer, type ActiveSos } from '@/hooks/useBouncer';
import { useSupportPods } from '@/hooks/useSupportPods';
import { toErrorMessage } from '@/utils/errors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** Danger SOS button with a busy spinner; disabled until a pod is selected. */
function SosSendButton({
  disabled,
  busy,
  onSend,
}: Readonly<{ disabled: boolean; busy: boolean; onSend: () => void }>) {
  const { t } = useTranslation();
  return (
    <XStack
      testID="sos-send"
      role="button"
      aria-label={t('mweb.sos.sendSos')}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onSend}
      height={52}
      alignItems="center"
      justifyContent="center"
      gap={8}
      borderRadius={999}
      backgroundColor="$danger"
      opacity={disabled ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      {busy ? <Spinner color="$onPrimary" /> : null}
      <Text fontSize={15} fontWeight="600" color="$onPrimary" letterSpacing={1}>
        {busy ? 'SENDING SOS…' : 'SEND SOS'}
      </Text>
    </XStack>
  );
}

/** SOS — emergency help scoped to a live pod. RN twin of mWeb's SosContent. */
export function SosScreen() {
  const { t } = useTranslation();
  const { success, danger } = useThemeColors();
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
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <PodPicker options={options} selectedId={selectedId} onChange={setSelectedId} />

        {active ? (
          <SurfaceCard testID="sos-active" padding={24} alignItems="center" gap={8}>
            <MaterialIcons name="check-circle" size={48} color={success} />
            <Text fontSize={16} fontWeight="600" color="$color" textAlign="center">
              SOS sent. Help is on the way.
            </Text>
            <Text fontSize={12} color="$muted" textAlign="center">
              {active.status === 'ACKNOWLEDGED' ? 'Acknowledged by team' : 'Awaiting response'} —
              stay on this screen until someone reaches you.
            </Text>
          </SurfaceCard>
        ) : (
          <>
            <XStack
              testID="sos-warning"
              gap={12}
              padding={16}
              borderRadius={18}
              backgroundColor="$dangerSoft"
            >
              <MaterialIcons name="warning-amber" size={22} color={danger} />
              <YStack flex={1} gap={2}>
                <Text fontSize={14} fontWeight="600" color="$color">
                  Only tap SOS in a real emergency
                </Text>
                <Text fontSize={12} color="$muted">
                  Your live location, profile phone and pod context will be shared with the host &
                  admin.
                </Text>
              </YStack>
            </XStack>
            <Field label={t('mweb.common.message')}>
              <TextArea
                testID="sos-message"
                aria-label={t('mweb.common.message')}
                value={message}
                onChangeText={setMessage}
                placeholder={t('mweb.common.quickNoteOptional')}
                placeholderTextColor="$muted"
                maxLength={500}
                backgroundColor="$surface"
                borderColor="$borderColor"
                borderRadius={14}
              />
            </Field>
            {error ? (
              <Text testID="sos-error" fontSize={13} color="$danger">
                {error}
              </Text>
            ) : null}
            <SosSendButton disabled={!selected || busy} busy={busy} onSend={() => void send()} />
          </>
        )}
      </RefreshScrollView>
    </StackScreen>
  );
}
