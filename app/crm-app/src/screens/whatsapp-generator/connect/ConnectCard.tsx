import { Text, XStack } from 'tamagui';
import { waConnectionStatusView } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { TabBar } from '@/components/TabBar';
import { ToneChip } from '@/components/ToneChip';
import type { WaConnect } from '@/features/whatsapp-generator/useWaConnect';
import { useTranslation } from '@/hooks/useTranslation';
import { ConnectedSummary } from './ConnectedSummary';
import { GatewayStep } from './GatewayStep';
import { LinkStep } from './LinkStep';
import type { WaConnection, WaConnectStep } from './types';

interface Props {
  connection: WaConnection;
  wa: WaConnect;
  step: WaConnectStep;
  onStep: (step: WaConnectStep) => void;
  onChanged: () => void;
}

/**
 * The connect panel as a two-step stepper — 1) gateway URL + API key, 2) Connect
 * and scan the QR — the portal's WhatsAppConnectCard. Nothing connects until the
 * person presses Connect. Once CONNECTED it is the linked-account summary.
 */
export function ConnectCard({ connection, wa, step, onStep, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();

  if (connection.status === 'CONNECTED') {
    return (
      <ConnectedSummary
        phone={connection.phone}
        busy={wa.busy}
        error={wa.actionError}
        onDisconnect={() =>
          fireAndForget(wa.stop(), logs.mobileApp, 'crm-app/WhatsAppConnect', 'disconnect')
        }
      />
    );
  }

  const view = waConnectionStatusView(connection.status);
  return (
    <Card testID="wa-connect-card">
      <XStack alignItems="center" gap="$2" flexWrap="wrap" marginBottom="$1">
        <Text fontWeight="700" fontSize="$5" role="heading">
          {t('crm.tools.gatewayConnection')}
        </Text>
        <ToneChip label={t(view.labelKey)} tone={view.tone} testID="wa-status" />
      </XStack>
      {/* As the portal's stepper, Link WhatsApp is reached only through Save & continue;
          the first step is a way back, like Back. */}
      <TabBar
        tabs={[
          { key: 'gateway', label: t('crm.tools.stepGateway') },
          { key: 'link', label: t('crm.tools.stepLink') },
        ]}
        active={step}
        onChange={(key) => {
          if (key === 'gateway' && !wa.busy) onStep('gateway');
        }}
        testID="wa-step"
      />
      {step === 'gateway' ? (
        <GatewayStep connection={connection} onChanged={onChanged} onDone={() => onStep('link')} />
      ) : (
        <LinkStep connection={connection} wa={wa} onBack={() => onStep('gateway')} />
      )}
    </Card>
  );
}
