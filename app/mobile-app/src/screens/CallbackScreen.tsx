import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TextArea, XStack } from 'tamagui';

import { Field } from '@/components/Field';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { SupportAlert } from '@/components/support/SupportAlert';
import { CallbackHistory } from '@/components/support/CallbackHistory';
import { useBouncer } from '@/hooks/useBouncer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toErrorMessage } from '@/utils/errors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

type SupportTarget = { phone: string; available: boolean } | null;

/** "Call support now" card — dials support directly when a phone is configured.
 * When no phone is configured the button reads as clearly disabled (muted, not
 * an active-looking red), matching mWeb's greyed-out disabled button. */
function CallNowCard({ target }: Readonly<{ target: SupportTarget }>) {
  const { t } = useTranslation();
  const { onPrimary, muted } = useThemeColors();
  const disabled = !target?.available;
  const fg = disabled ? muted : onPrimary;
  return (
    <SurfaceCard gap={12}>
      <Text fontSize={16} fontWeight="600" color="$color">
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
        aria-label={t('mweb.callback.callNow')}
        aria-disabled={disabled}
        onPress={target?.available ? () => Linking.openURL(`tel:${target.phone}`) : undefined}
        height={52}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={999}
        backgroundColor={disabled ? '$muted' : '$primary'}
        opacity={disabled ? 0.45 : 1}
        pressStyle={{ opacity: disabled ? 0.45 : 0.85 }}
      >
        <MaterialIcons name="call" size={18} color={fg} />
        <Text fontSize={14} fontWeight="600" color={fg}>
          Call Now
        </Text>
      </XStack>
    </SurfaceCard>
  );
}

/** Callback Request — call support now or request a callback. RN twin of mWeb's
 * CallbackContent. */
export function CallbackScreen() {
  const { t } = useTranslation();
  const { loadSupportTarget, requestCallback } = useBouncer();
  const { primary } = useThemeColors();
  const [target, setTarget] = useState<SupportTarget>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

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
      setHistoryKey((k) => k + 1);
    } catch (e) {
      setError(toErrorMessage(e, 'Could not request callback.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StackScreen title={t('mweb.common.callbackRequest')} testID="callback-screen">
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <CallNowCard target={target} />

        <SurfaceCard gap={12}>
          <Text fontSize={16} fontWeight="600" color="$color">
            Request a callback
          </Text>
          <Text fontSize={13} color="$muted">
            We will call you back on your registered phone number.
          </Text>
          <Field label={t('mweb.common.reason')}>
            <TextArea
              testID="callback-reason"
              aria-label={t('mweb.common.reason')}
              value={reason}
              onChangeText={setReason}
              placeholder="What's it about? (optional)"
              placeholderTextColor="$muted"
              maxLength={500}
              backgroundColor="$surface"
              borderColor="$borderColor"
              borderRadius={14}
            />
          </Field>
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
              message={t('mweb.callback.callbackRequestedWeWillReachYou')}
              onClose={() => setRequested(false)}
            />
          ) : null}
          <XStack
            testID="callback-request"
            role="button"
            aria-label={t('mweb.callback.requestCallback')}
            aria-disabled={busy}
            onPress={busy ? undefined : () => void request()}
            height={52}
            alignItems="center"
            justifyContent="center"
            gap={8}
            borderRadius={999}
            borderWidth={1}
            borderColor="$primary"
            opacity={busy ? 0.6 : 1}
            pressStyle={PRESS_STYLE.control}
          >
            <MaterialIcons name="phone-callback" size={18} color={primary} />
            <Text fontSize={14} fontWeight="600" color="$primary">
              {busy ? 'Requesting…' : 'Request callback'}
            </Text>
          </XStack>
        </SurfaceCard>

        <CallbackHistory refreshKey={historyKey} />
      </RefreshScrollView>
    </StackScreen>
  );
}
