import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ListSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { usePublicPolicies } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** Policies — the list of policy documents; tapping opens the reader. */
export function PoliciesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading } = usePublicPolicies();
  const { accent, muted } = useThemeColors();
  const policies = data?.publicPolicies ?? [];

  return (
    <StackScreen title={t('mweb.common.policies')} testID="policies-screen">
      {isLoading && policies.length === 0 ? (
        <ListSkeleton testID="policies-loading" count={5} />
      ) : (
        <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
          {policies.length === 0 ? (
            <Text testID="policies-empty" textAlign="center" color="$muted" paddingVertical={40}>
              No policies available.
            </Text>
          ) : (
            <SurfaceCard padding={0} overflow="hidden">
              {policies.map((policy, index) => (
                <XStack
                  key={policy.id}
                  testID={`policy-${policy.slug}`}
                  role="button"
                  aria-label={policy.title}
                  onPress={() => navigation.navigate('Policy', { slug: policy.slug })}
                  alignItems="center"
                  gap={12}
                  paddingHorizontal={16}
                  paddingVertical={14}
                  borderTopWidth={index === 0 ? 0 : 1}
                  borderTopColor="$borderColor"
                  pressStyle={PRESS_STYLE.row}
                >
                  <YStack
                    width={40}
                    height={40}
                    borderRadius={20}
                    backgroundColor="$soft"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <MaterialIcons name="description" size={20} color={accent} />
                  </YStack>
                  <Text flex={1} fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
                    {policy.title}
                  </Text>
                  <MaterialIcons name="chevron-right" size={22} color={muted} />
                </XStack>
              ))}
            </SurfaceCard>
          )}
        </RefreshScrollView>
      )}
    </StackScreen>
  );
}
