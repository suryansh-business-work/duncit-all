import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';
import type { StudioOptionItem } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuStackRoute, RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';
import { StudioOptionRow } from './StudioOptionRow';
import { STUDIO_OPTION_ICON, studioOptionTarget } from './studioOptionTarget';

/**
 * Every option of the studio, one row each, in the catalogue's order — hairlines
 * between rows inside one card. An option with an app screen navigates to it;
 * one without opens the Partner console in the browser.
 */
export function StudioOptionsList({ items }: Readonly<{ items: readonly StudioOptionItem[] }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Every option route is a param-less screen; RN v7's distributive `navigate`
  // needs the narrower signature spelled out.
  const navigate: (screen: MenuStackRoute) => void = navigation.navigate;
  const external = t('mweb.studioOptions.opensInPartnerApp');

  if (items.length === 0) return null;

  return (
    <SurfaceCard testID="studio-options-list" padding={0} overflow="hidden">
      {items.map((item, index) => {
        const target = studioOptionTarget(item);
        const open = () => {
          if (target.kind === 'route') navigate(target.route);
          else fireAndForget(Linking.openURL(target.url));
        };
        return (
          <YStack key={item.key} borderTopWidth={index === 0 ? 0 : 1} borderColor="$borderColor">
            <StudioOptionRow
              testID={`studio-option-${item.key}`}
              icon={STUDIO_OPTION_ICON[item.icon]}
              title={t(item.labelKey)}
              hint={t(item.hintKey)}
              external={target.kind === 'portal' ? external : undefined}
              onPress={open}
            />
          </YStack>
        );
      })}
    </SurfaceCard>
  );
}
