import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { STUDIO_LABEL, type StudioMode } from '@/utils/studio-mode';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { HeaderLocationRow } from './HeaderLocationRow';

interface Props {
  minimal: boolean;
  studio: StudioMode;
  onOpenSwitch: () => void;
  onOpenLocation: () => void;
}

/**
 * Row one's left side: the location pill, led by the role pill in a studio.
 * A studio header keeps the location switcher — a host/venue/club account
 * still browses a city, so the picker stays. The survey header (`minimal`)
 * has no city to browse yet and shows neither. mWeb twin: HeaderLeading.
 */
export function HeaderLeading({ minimal, studio, onOpenSwitch, onOpenLocation }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  if (minimal) return <XStack flex={1} />;

  return (
    <XStack alignItems="center" gap={8} flex={1} minWidth={0}>
      {studio === 'USER' ? null : (
        <XStack
          testID="header-studio-badge"
          role="button"
          aria-label={t('mweb.common.switchRole')}
          onPress={onOpenSwitch}
          alignItems="center"
          gap={6}
          height={40}
          paddingHorizontal={14}
          flexShrink={0}
          borderRadius={999}
          backgroundColor="$primarySoft"
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="swap-horiz" size={16} color={primary} />
          <Text fontSize={13} fontWeight="600" color="$primary" numberOfLines={1}>
            {STUDIO_LABEL[studio]}
          </Text>
        </XStack>
      )}
      <HeaderLocationRow onOpen={onOpenLocation} />
    </XStack>
  );
}
