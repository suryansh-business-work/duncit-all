import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { waExtractionView } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import { RADII } from '@/constants/design';
import { useWaExtraction, type WaJob } from '@/features/whatsapp-generator/extractionStore';
import { WA_TONE_COLOR } from '@/features/whatsapp-generator/format';
import { useTranslation } from '@/hooks/useTranslation';
import { ExtractionDetails } from './ExtractionDetails';
import { ExtractionProgress, ExtractionStats } from './ExtractionProgress';

type IconName = 'info-outline' | 'remove' | 'close';

interface ActionProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  color: string | undefined;
  testID: string;
}

/** A small icon button with its screen-reader name. */
function IconAction({ icon, label, onPress, color, testID }: Readonly<ActionProps>) {
  return (
    <XStack
      role="button"
      aria-label={label}
      onPress={onPress}
      padding="$2"
      hitSlop={6}
      testID={testID}
    >
      <MaterialIcons name={icon} size={20} color={color} />
    </XStack>
  );
}

/**
 * The expanded progress card — the portal's floating widget: the job's state,
 * Details, Minimize, and Cancel (while running) or Dismiss (once it stopped).
 */
export function ExtractionCard({ job }: Readonly<{ job: WaJob }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const error = useWaExtraction((s) => s.error);
  const [details, setDetails] = useState(false);
  const running = job.status === 'RUNNING';
  const view = waExtractionView(job.status);
  const toneColor = theme[WA_TONE_COLOR[view.tone]]?.val;

  const close = () => {
    const store = useWaExtraction.getState();
    if (!running) {
      store.dismiss();
      return;
    }
    fireAndForget(
      store.cancel(t('crmApp.common.saveFailed')),
      logs.mobileApp,
      'crm-app/WhatsAppExtraction',
      'cancel',
    );
  };

  return (
    <YStack
      width="100%"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={RADII.lg}
      padding="$3"
      gap="$2"
      testID="wa-extraction-card"
    >
      <XStack alignItems="center" gap="$1">
        {running ? (
          <Spinner color="$warning" />
        ) : (
          <MaterialIcons name="sync" size={20} color={toneColor} />
        )}
        <Text flex={1} fontWeight="800" numberOfLines={1} marginLeft="$1" aria-live="polite">
          {t(view.labelKey)}
        </Text>
        <IconAction
          icon="info-outline"
          label={t('crm.tools.details')}
          onPress={() => setDetails(true)}
          color={theme.muted?.val}
          testID="wa-extraction-details"
        />
        <IconAction
          icon="remove"
          label={t('crm.tools.minimize')}
          onPress={() => useWaExtraction.getState().setOpen(false)}
          color={theme.muted?.val}
          testID="wa-extraction-minimize"
        />
        <IconAction
          icon="close"
          label={running ? t('crm.tools.cancelExtraction') : t('crm.tools.dismiss')}
          onPress={close}
          color={running ? theme.danger?.val : theme.muted?.val}
          testID="wa-extraction-close"
        />
      </XStack>
      <ExtractionProgress job={job} />
      {job.status === 'FAILED' ? (
        <Text color="$danger" role="alert" testID="wa-extraction-failed">
          {job.error || t('crm.tools.extractionFailedFallback')}
        </Text>
      ) : (
        <ExtractionStats job={job} />
      )}
      {error ? (
        <Text color="$danger" role="alert" testID="wa-extraction-error">
          {error}
        </Text>
      ) : null}
      <ExtractionDetails job={job} open={details} onClose={() => setDetails(false)} />
    </YStack>
  );
}
