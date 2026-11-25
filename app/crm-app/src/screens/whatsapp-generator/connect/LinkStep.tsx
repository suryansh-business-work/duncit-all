import { Image } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import type { WaConnect } from '@/features/whatsapp-generator/useWaConnect';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import type { WaConnection } from './types';

const QR_SIZE = 240;

interface QrProps {
  connecting: boolean;
  qr: string | undefined;
  /** Beside the spinner until a QR arrives (a resumed session usually needs none). */
  waitingText: string;
}

/** The QR to scan while CONNECTING, or a spinner until the gateway hands one over. */
function QrSection({ connecting, qr, waitingText }: Readonly<QrProps>) {
  const { t } = useTranslation();
  if (!connecting) return null;
  if (qr) {
    return (
      <YStack alignItems="center" gap="$2">
        <Text color="$muted" textAlign="center">
          {t('crm.tools.scanInstructions')}
        </Text>
        <Image
          source={{ uri: qr }}
          accessible
          accessibilityLabel={t('crm.tools.whatsappQr')}
          style={{ width: QR_SIZE, height: QR_SIZE }}
          testID="wa-qr"
        />
      </YStack>
    );
  }
  return (
    <XStack role="status" aria-live="polite" gap="$2" alignItems="center" justifyContent="center">
      <Spinner color="$accentText" />
      <Text color="$muted">{waitingText}</Text>
    </XStack>
  );
}

interface Props {
  connection: WaConnection;
  wa: WaConnect;
  onBack: () => void;
}

/**
 * Step 2: Connect starts the session on the gateway and shows its QR to scan.
 * Once the phone links, the screen flips to the connected summary and the lead
 * tools open. A session that is booting or failed offers Restart instead.
 */
export function LinkStep({ connection, wa, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const active = wa.connecting || wa.starting;
  const stalled = wa.connecting || connection.status === 'ERROR';
  const error = wa.actionError || connection.last_error;
  const iconColor = theme.onPrimary?.val;

  return (
    <YStack gap="$3">
      {active ? null : <Text color="$muted">{t('crm.tools.linkIntro')}</Text>}
      {error ? <AuthAlert message={error} testID="wa-link-error" /> : null}
      <QrSection
        connecting={active}
        qr={wa.qr}
        waitingText={wa.linkedBefore ? t('crm.tools.resumingSession') : t('crm.tools.waitingForQr')}
      />
      {wa.connecting ? (
        <Text color="$muted" fontSize="$2" textAlign="center">
          {t('crm.tools.helpStepStuck')}
        </Text>
      ) : null}
      <DuncitButton
        label={stalled ? t('crm.tools.restartConnection') : t('crm.tools.connect')}
        icon={
          stalled ? (
            <MaterialIcons name="restart-alt" size={18} color={iconColor} />
          ) : (
            <MaterialCommunityIcons name="whatsapp" size={18} color={iconColor} />
          )
        }
        onPress={() =>
          fireAndForget(wa.start(stalled), logs.mobileApp, 'crm-app/WhatsAppConnect', 'connect')
        }
        disabled={wa.busy}
        fullWidth
        testID="wa-connect"
      />
      <DuncitButton
        label={t('crm.tools.backToGateway')}
        icon={<MaterialIcons name="arrow-back" size={18} color={theme.accentText?.val} />}
        onPress={onBack}
        variant="ghost"
        disabled={wa.busy}
        fullWidth
        testID="wa-back"
      />
    </YStack>
  );
}
