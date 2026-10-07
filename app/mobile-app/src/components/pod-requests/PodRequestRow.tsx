import type { ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SurfaceCard } from '@/components/SurfaceCard';
import type { PodRequestRow as Row } from '@/hooks/usePodRequests';
import type { RootStackParamList } from '@/navigation/types';
import { counterpartOf } from './counterpart';
import { PartnerAvatar } from './PartnerAvatar';
import { PodRequestStatusChip } from './PodRequestStatusChip';

interface Props {
  request: Row;
  /** Inline answers on the Requests tab. */
  actions?: ReactNode;
}

/** One request in a studio list: who it is with, its status; a tap opens its detail. */
export function PodRequestRow({ request, actions }: Readonly<Props>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const who = counterpartOf(request);
  return (
    <SurfaceCard testID={`pod-request-row-${request.id}`} gap={10}>
      <XStack
        role="button"
        tabIndex={0}
        aria-label={who.name}
        onPress={() => navigation.navigate('PodRequestDetail', { id: request.id })}
        pressStyle={PRESS_STYLE.surface}
        alignItems="center"
        gap={12}
      >
        <PartnerAvatar kind={who.kind} imageUrl={who.imageUrl} size={48} />
        <YStack flex={1} gap={2}>
          <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
            {who.name}
          </Text>
          {who.subtitle ? (
            <Text fontSize={12} color="$muted" numberOfLines={1}>
              {who.subtitle}
            </Text>
          ) : null}
          {request.note ? (
            <Text fontSize={12} color="$muted" numberOfLines={2}>
              {request.note}
            </Text>
          ) : null}
        </YStack>
        <PodRequestStatusChip status={request.status} testID={`pod-request-status-${request.id}`} />
      </XStack>
      {actions}
    </SurfaceCard>
  );
}
