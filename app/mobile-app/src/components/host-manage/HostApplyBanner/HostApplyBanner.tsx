import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useMe } from '@/hooks/useMe';
import { useMyHostRequest } from '@/hooks/useMyHostRequest';
import { useThemeColors } from '@/hooks/useThemeColors';
import { applyButtonState } from '@/graphql/host-request';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * Host Studio card inviting an approved host to apply to host in another
 * category — an accent mark, one title and one green CTA. Renders only for
 * HOST-role users; the button locks to "Applied" while a request is pending and
 * refetches that lock on screen focus. mWeb twin: host-apply-page/HostApplyBanner.
 */
export function HostApplyBanner() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accent } = useThemeColors();
  const roles = useMe().data?.me?.roles ?? [];
  const { request, refetch } = useMyHostRequest();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fireAndForget(refetch()));
    return unsubscribe;
  }, [navigation, refetch]);

  if (!roles.includes('HOST')) return null;

  const { label, disabled } = applyButtonState(request);

  return (
    <SurfaceCard testID="host-apply-banner" flexDirection="row" alignItems="center" gap={12}>
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name="add-business" size={22} color={accent} />
      </YStack>
      <Text flex={1} fontSize={16} fontWeight="600" color="$color">
        Ready to Host More Experiences?
      </Text>
      {disabled ? (
        <XStack
          testID="host-apply-applied"
          height={40}
          paddingHorizontal={16}
          alignItems="center"
          borderRadius={999}
          backgroundColor="$soft"
        >
          <Text fontSize={14} fontWeight="600" color="$muted">
            {label}
          </Text>
        </XStack>
      ) : (
        <XStack
          testID="host-apply-cta"
          role="button"
          aria-label={t('mweb.hostManage.applyNow')}
          onPress={() => navigation.navigate('HostApply')}
          height={40}
          paddingHorizontal={16}
          alignItems="center"
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={PRESS_STYLE.solid}
        >
          <Text fontSize={14} fontWeight="600" color="$onPrimary">
            {label}
          </Text>
        </XStack>
      )}
    </SurfaceCard>
  );
}
