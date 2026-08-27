import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { mwebPodMediaLabels } from '@duncit/utils';

import { PodMediaGrid } from '@/components/pod-media/PodMediaGrid';
import { usePodMediaBoard } from '@/hooks/usePodMediaBoard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  podId: string;
  /** Closes the dialog before navigating — a screen cannot open under a modal. */
  onLeave: () => void;
}

/**
 * The Complete Pod dialog's Pod Media section: what the pod already HAS.
 *
 * It used to be a picker — a second place to upload the same photos, whose
 * answer lived only in the release it created. The media now belongs to the
 * pod, uploaded on its own screen by the host and by the guests from the link
 * they were given, so completing shows what is there and offers the way to add
 * more rather than asking for it a second time. The mWeb twin is
 * `@duncit/host-pod-actions`' PodMediaSummary (rule 27).
 */
export function PodMediaSummary({ podId, onLeave }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const labels = useMemo(() => mwebPodMediaLabels(t), [t]);
  const { board } = usePodMediaBoard(podId);
  const { primary } = useThemeColors();

  const open = () => {
    onLeave();
    navigation.navigate('PodMedia', { podId });
  };

  return (
    <YStack gap={8}>
      <XStack alignItems="center" gap={8}>
        <Text fontSize={13.5} fontWeight="700" flex={1}>
          {t('mweb.hostManage.podMedia')}
        </Text>
        <XStack
          pressStyle={PRESS_STYLE.surface}
          testID="pod-complete-open-media"
          alignItems="center"
          gap={4}
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={labels.pageTitle}
        >
          <MaterialIcons name="photo-camera-back" size={16} color={primary} />
          <Text fontSize={12.5} fontWeight="700" color={primary}>
            {labels.pageTitle}
          </Text>
        </XStack>
      </XStack>
      <PodMediaGrid items={board?.items ?? []} labels={labels} />
    </YStack>
  );
}
