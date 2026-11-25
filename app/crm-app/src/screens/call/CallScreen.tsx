import { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationAction,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { Text, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { CallLead } from '@/features/calls/callLine';
import { useCallLine } from '@/features/calls/useCallLine';
import { CrmAppCallSetupDocument } from '@/graphql/call';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { dialNumber } from '@/services/dialer';
import { CallSetupSection } from './CallSetupSection';
import { LiveCallSection } from './LiveCallSection';

const SCOPE = 'crm-app/CallScreen';

/**
 * A call on the CRM call line — the portal's call window on a phone: set up,
 * live (status, Mute / Hold / End, transcript) and ended. Leaving while the
 * call is live asks first, as closing the portal's window does.
 */
export function CallScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'Call'>>();
  const lead: CallLead = useMemo(
    () => ({
      to: params.to,
      kind: params.kind,
      leadId: params.id,
      leadName: params.leadName,
      contactName: params.contactName,
    }),
    [params],
  );
  const call = useCallLine(lead, t('crm.call.callFailed'));
  const setup = useGqlQuery(
    CrmAppCallSetupDocument,
    {},
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const [pending, setPending] = useState<NavigationAction | null>(null);
  const [ending, setEnding] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: t('crm.call.title', { vars: { name: params.leadName } }) });
  }, [navigation, params.leadName, t]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!call.live) return;
        event.preventDefault();
        setPending(event.data.action);
      }),
    [navigation, call.live],
  );

  const endAndLeave = async () => {
    if (!pending) return;
    setEnding(true);
    const ended = await call.control('END');
    setEnding(false);
    if (!ended) return;
    const action = pending;
    setPending(null);
    navigation.dispatch(action);
  };

  const simCall = async () => {
    const result = await dialNumber(params.to);
    if (result === 'dialer') setNote(t('crmApp.dialer.openedDialer'));
    else if (result === 'unavailable') setNote(t('crmApp.dialer.unavailable'));
    else setNote(null);
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {call.logId ? (
          <LiveCallSection call={call} setup={setup.data?.crmCallSetup ?? null} to={params.to} />
        ) : (
          <CallSetupSection
            setup={setup.data?.crmCallSetup ?? null}
            loading={setup.loading}
            setupError={setup.error}
            call={call}
            to={params.to}
            onSimCall={() => fireAndForget(simCall(), logs.mobileApp, SCOPE, 'simCall')}
          />
        )}
        {note ? (
          <Text color="$muted" aria-live="polite">
            {note}
          </Text>
        ) : null}
      </ScrollView>
      <ConfirmDialog
        open={pending !== null}
        title={t('crm.call.closeConfirmTitle')}
        message={t('crm.call.closeConfirmBody')}
        confirmLabel={ending ? t('crm.call.ending') : t('crm.call.endAndClose')}
        cancelLabel={t('crm.call.continueCall')}
        danger
        busy={ending}
        error={call.error}
        onConfirm={() => fireAndForget(endAndLeave(), logs.mobileApp, SCOPE, 'endAndLeave')}
        onCancel={() => setPending(null)}
        testID="call-leave-dialog"
      />
    </YStack>
  );
}
