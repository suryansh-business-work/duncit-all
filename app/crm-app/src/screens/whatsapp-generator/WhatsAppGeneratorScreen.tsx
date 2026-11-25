import { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { YStack } from 'tamagui';
import { waInitialConnectStep } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import { StateView } from '@/components/StateView';
import { useWaExtraction } from '@/features/whatsapp-generator/extractionStore';
import { useWaConnect } from '@/features/whatsapp-generator/useWaConnect';
import { CrmAppWhatsappConnectionDocument } from '@/graphql/whatsappGenerator';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { WhatsAppBrowser } from './browser/WhatsAppBrowser';
import { ConnectCard } from './connect/ConnectCard';
import type { WaConnection } from './connect/types';

const SCOPE = 'crm-app/WhatsAppGenerator';
const NO_VARS = {};

/**
 * The connect state machine and the stepper's step live here, above the two
 * layouts, so moving between them (connected or not) keeps both — as the
 * portal's card, which never remounts.
 */
function GeneratorBody({
  connection,
  onChanged,
}: Readonly<{ connection: WaConnection; onChanged: () => void }>) {
  const { t } = useTranslation();
  const wa = useWaConnect(connection, onChanged, t('crmApp.common.saveFailed'));
  const [step, setStep] = useState(() => waInitialConnectStep(connection));
  const card = (
    <ConnectCard
      connection={connection}
      wa={wa}
      step={step}
      onStep={setStep}
      onChanged={onChanged}
    />
  );
  if (connection.status === 'CONNECTED') return <WhatsAppBrowser top={card} />;
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      {card}
    </ScrollView>
  );
}

/**
 * CRM › Tools › WhatsApp Lead Generator — the portal page on the phone: link a
 * WhatsApp account through the OpenWA gateway (gateway URL + API key typed in,
 * then Connect and scan the QR), then browse its Communities / Groups / Users
 * and extract them into the WhatsApp Leads.
 */
export function WhatsAppGeneratorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const saved = useGqlQuery(CrmAppWhatsappConnectionDocument, NO_VARS, {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const connection = saved.data?.waConnection ?? null;
  const { refetch } = saved;
  const onChanged = useCallback(
    () => fireAndForget(refetch(), logs.mobileApp, SCOPE, 'refreshConnection'),
    [refetch],
  );

  useEffect(() => {
    navigation.setOptions({ title: t('shell.nav.whatsappLeadGenerator') });
  }, [navigation, t]);

  // The latest extraction job, in case one was started elsewhere (the portal, another phone).
  useEffect(() => {
    fireAndForget(useWaExtraction.getState().load(), logs.mobileApp, SCOPE, 'extraction');
  }, []);

  if (saved.error || !connection) {
    return (
      <YStack flex={1} backgroundColor="$background" padding="$4">
        <StateView loading={saved.loading} error={saved.error} onRetry={onChanged} />
      </YStack>
    );
  }
  return (
    <YStack flex={1} backgroundColor="$background">
      <GeneratorBody connection={connection} onChanged={onChanged} />
    </YStack>
  );
}
