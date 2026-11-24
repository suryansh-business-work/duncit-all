import { useState } from 'react';
import { Card, CardContent, Chip, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { WaConnection } from '../whatsappQueries';
import ConnectedSummary from './ConnectedSummary';
import GatewayStep from './GatewayStep';
import LinkStep from './LinkStep';
import { useWaConnect } from './useWaConnect';

const STATUS_COLOR: Record<WaConnection['status'], 'success' | 'warning' | 'error' | 'default'> = {
  CONNECTED: 'success',
  CONNECTING: 'warning',
  ERROR: 'error',
  DISCONNECTED: 'default',
};

const STATUS_LABEL_KEY: Record<WaConnection['status'], string> = {
  CONNECTED: 'crm.tools.statusConnected',
  CONNECTING: 'crm.tools.statusConnecting',
  ERROR: 'crm.tools.statusError',
  DISCONNECTED: 'crm.tools.statusDisconnected',
};

/** Step indexes of the connect stepper. */
const GATEWAY_STEP = 0;
const LINK_STEP = 1;

interface Props {
  connection: WaConnection;
  onChanged: () => void;
}

/**
 * Connect panel as a two-step stepper: 1) gateway URL + API key, 2) Connect and scan the QR.
 * Nothing connects until the person presses Connect. A session that is already booting, or one
 * linked before, opens on step 2. On CONNECTED it flips to the connected summary and the page
 * opens the lead tools.
 */
export default function WhatsAppConnectCard({ connection, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const wa = useWaConnect(connection, onChanged);
  const [step, setStep] = useState(
    connection.status === 'CONNECTING' || connection.connected_at ? LINK_STEP : GATEWAY_STEP,
  );

  if (connection.status === 'CONNECTED') {
    return <ConnectedSummary connection={connection} busy={wa.busy} onDisconnect={wa.stop} />;
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography component="h2" sx={{ fontWeight: 800 }}>
              {t('crm.tools.gatewayConnection')}
            </Typography>
            <Chip size="small" label={t(STATUS_LABEL_KEY[connection.status])} color={STATUS_COLOR[connection.status]} />
          </Stack>
          <Stepper activeStep={step} alternativeLabel>
            <Step completed={step > GATEWAY_STEP}>
              <StepLabel>{t('crm.tools.stepGateway')}</StepLabel>
            </Step>
            <Step>
              <StepLabel>{t('crm.tools.stepLink')}</StepLabel>
            </Step>
          </Stepper>
          {step === GATEWAY_STEP ? (
            <GatewayStep connection={connection} onChanged={onChanged} onDone={() => setStep(LINK_STEP)} />
          ) : (
            <LinkStep connection={connection} wa={wa} onBack={() => setStep(GATEWAY_STEP)} />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
