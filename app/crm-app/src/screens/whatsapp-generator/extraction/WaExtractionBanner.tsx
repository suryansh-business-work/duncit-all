import { useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { waExtractionPercent, waExtractionView } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import { RADII } from '@/constants/design';
import { useWaExtraction, type WaJob } from '@/features/whatsapp-generator/extractionStore';
import { WA_TONE_COLOR } from '@/features/whatsapp-generator/format';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth.store';
import { ExtractionCard } from './ExtractionCard';

/** Above the bottom tab bar (and the gesture area), so the banner never covers a tab. */
const BANNER_BOTTOM = 88;

/** Collapsed: a chip with the job's state that opens the card again. */
function ExtractionChip({ job }: Readonly<{ job: WaJob }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const running = job.status === 'RUNNING';
  const view = waExtractionView(job.status);
  const color = WA_TONE_COLOR[view.tone];
  const label = running
    ? t('crm.tools.extractingPercent', { vars: { pct: waExtractionPercent(job) } })
    : t(view.labelKey);
  return (
    <XStack
      role="button"
      aria-label={label}
      onPress={() => useWaExtraction.getState().setOpen(true)}
      alignItems="center"
      gap="$2"
      minHeight={44}
      paddingHorizontal="$3"
      borderRadius={RADII.pill}
      borderWidth={1}
      borderColor={`$${color}`}
      backgroundColor="$surface"
      testID="wa-extraction-chip"
    >
      {running ? (
        <Spinner color={`$${color}`} />
      ) : (
        <MaterialIcons name="info-outline" size={18} color={theme[color]?.val} />
      )}
      <Text color={`$${color}`} fontWeight="700">
        {label}
      </Text>
    </XStack>
  );
}

/**
 * The WhatsApp extraction's progress, floating over every screen while signed
 * in — the portal's ExtractionWidget. Mounted once, beside the navigator: it
 * reads the latest job at sign-in, keeps a running one polled wherever the
 * person goes, and forgets it at sign-out.
 */
export function WaExtractionBanner() {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const job = useWaExtraction((s) => s.job);
  const open = useWaExtraction((s) => s.open);
  const hiddenId = useWaExtraction((s) => s.hiddenId);

  useEffect(() => {
    if (!signedIn) return undefined;
    const store = useWaExtraction.getState();
    fireAndForget(store.load(), logs.mobileApp, 'crm-app/WhatsAppExtraction', 'load');
    return () => store.stop();
  }, [signedIn]);

  if (!signedIn || !job || job.id === hiddenId) return null;
  return (
    <YStack
      position="absolute"
      left={16}
      right={16}
      bottom={BANNER_BOTTOM}
      alignItems="flex-end"
      pointerEvents="box-none"
      testID="wa-extraction-banner"
    >
      {open ? <ExtractionCard job={job} /> : <ExtractionChip job={job} />}
    </YStack>
  );
}
