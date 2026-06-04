import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack } from 'tamagui';

import { ListSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { usePublicPolicies } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/** Policies — the list of policy documents; tapping opens the reader. */
export function PoliciesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading } = usePublicPolicies();
  const { primary, muted } = useThemeColors();
  const policies = data?.publicPolicies ?? [];

  return (
    <StackScreen title="Policies" testID="policies-screen">
      {isLoading && policies.length === 0 ? (
        <ListSkeleton testID="policies-loading" count={5} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}>
          {policies.length === 0 ? (
            <Text testID="policies-empty" textAlign="center" color="$muted" paddingVertical={40}>
              No policies available.
            </Text>
          ) : (
            policies.map((policy) => (
              <XStack
                key={policy.id}
                testID={`policy-${policy.slug}`}
                role="button"
                aria-label={policy.title}
                onPress={() => navigation.navigate('Policy', { slug: policy.slug })}
                alignItems="center"
                gap={12}
                padding={14}
                borderRadius={14}
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$surface"
                pressStyle={{ opacity: 0.85 }}
              >
                <MaterialIcons name="description" size={20} color={primary} />
                <Text flex={1} fontSize={14.5} fontWeight="800" color="$color" numberOfLines={1}>
                  {policy.title}
                </Text>
                <MaterialIcons name="chevron-right" size={22} color={muted} />
              </XStack>
            ))
          )}
        </ScrollView>
      )}
    </StackScreen>
  );
}
