import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, YStack } from 'tamagui';
import {
  LOADING_TIP_INTERVAL_MS,
  LOADING_TIP_TITLE_KEY,
  loadingTipKeyAt,
  nextLoadingTipIndex,
} from '@duncit/utils';

import { useLoadingRegion } from '@/components/Skeleton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  testID: string;
}

/**
 * A friendly first load: a spinner, a lightbulb, "Did you know?" and a tip
 * that changes every few seconds — instead of a bare spinner on a slow list.
 * The tips and their order come from `@duncit/utils` (loading-tips), so mWeb's
 * twin (components/TipsLoader) shows the same ones.
 *
 * Only the spinner speaks to a screen reader ("Loading…"): the tip is not a
 * live region, so it is not re-announced every time it changes.
 */
export function TipsLoader({ testID }: Readonly<Props>) {
  const loadingRegion = useLoadingRegion();
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => nextLoadingTipIndex(current)),
      LOADING_TIP_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <YStack
      testID={testID}
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap={12}
      padding={32}
    >
      <Spinner {...loadingRegion} color="$primary" />
      <YStack
        aria-hidden
        width={56}
        height={56}
        borderRadius={28}
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="lightbulb-outline" size={30} color={accent} />
      </YStack>
      <Text fontSize={16} fontWeight="600" color="$color" textAlign="center">
        {t(LOADING_TIP_TITLE_KEY)}
      </Text>
      <Text testID={`${testID}-tip`} fontSize={14} color="$muted" textAlign="center" maxWidth={420}>
        {t(loadingTipKeyAt(index))}
      </Text>
    </YStack>
  );
}
