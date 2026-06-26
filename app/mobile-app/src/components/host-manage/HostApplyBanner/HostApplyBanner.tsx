import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { useMe } from '@/hooks/useMe';
import { useMyHostRequest } from '@/hooks/useMyHostRequest';
import { applyButtonState } from '@/graphql/host-request';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Host Studio CTA inviting an approved host to apply to host in another
 * category. Renders only for HOST-role users; the button locks to "Applied"
 * while a request is pending and refetches that lock on screen focus.
 */
export function HostApplyBanner() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const roles = useMe().data?.me?.roles ?? [];
  const { request, refetch } = useMyHostRequest();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => void refetch());
    return unsubscribe;
  }, [navigation, refetch]);

  if (!roles.includes('HOST')) return null;

  const { label, disabled } = applyButtonState(request);

  return (
    <YStack
      testID="host-apply-banner"
      gap={10}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={16} fontWeight="900" color="$color">
        Ready to Host More Experiences?
      </Text>
      <Text fontSize={13} color="$muted">
        You{'’'}ve already inspired a community with one category. Why stop there? Expand your
        journey, showcase another skill, and start hosting experiences in a new category.
      </Text>
      {disabled ? (
        <XStack
          testID="host-apply-applied"
          alignSelf="flex-start"
          paddingHorizontal={18}
          paddingVertical={10}
          borderRadius={999}
          backgroundColor="$muted"
          opacity={0.7}
        >
          <Text fontSize={13} fontWeight="900" color="$onPrimary">
            {label}
          </Text>
        </XStack>
      ) : (
        <XStack
          testID="host-apply-cta"
          role="button"
          aria-label="Apply Now"
          alignSelf="flex-start"
          onPress={() => navigation.navigate('HostApply')}
          paddingHorizontal={18}
          paddingVertical={10}
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={13} fontWeight="900" color="$onPrimary">
            {label}
          </Text>
        </XStack>
      )}
    </YStack>
  );
}
