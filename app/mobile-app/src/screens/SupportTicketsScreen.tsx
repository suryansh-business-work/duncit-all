import type { ComponentProps } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TicketForm } from '@/components/support/TicketForm';
import { MyTicketsList } from '@/components/support/MyTicketsList';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useMeStore } from '@/stores/me.store';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** A 40px soft disc carrying an accent glyph — the banners' leading mark. */
function IconDisc({ name }: Readonly<{ name: ComponentProps<typeof MaterialIcons>['name'] }>) {
  const { accent } = useThemeColors();
  return (
    <YStack
      width={40}
      height={40}
      borderRadius={20}
      backgroundColor="$soft"
      alignItems="center"
      justifyContent="center"
    >
      <MaterialIcons name={name} size={20} color={accent} />
    </YStack>
  );
}

/**
 * Create Support Tickets — opens straight onto the form (mWeb parity), with the
 * "help squad" reassurance and a "maybe answered already?" shortcut to FAQs. The
 * user's existing tickets live on the All Support Tickets screen, not here.
 */
export function SupportTicketsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SupportTickets'>>();
  const podId = route.params?.podId;
  const podTitle = route.params?.podTitle;
  const me = useMeStore((s) => s.data?.me);
  const { muted } = useThemeColors();

  return (
    <StackScreen title={t('mweb.common.createSupportTickets')} testID="support-tickets-screen">
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
        <SurfaceCard testID="tickets-help-banner" flexDirection="row" alignItems="center" gap={12}>
          <IconDisc name="support-agent" />
          <YStack flex={1}>
            <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
              Help squad is ready
            </Text>
            <Text fontSize={12} color="$muted">
              Average reply within 24 hours
            </Text>
          </YStack>
          <XStack
            paddingHorizontal={10}
            paddingVertical={4}
            borderRadius={999}
            backgroundColor="$success"
          >
            <Text fontSize={11} fontWeight="600" color="$onPrimary">
              {t('mweb.common.live')}
            </Text>
          </XStack>
        </SurfaceCard>

        <SurfaceCard
          testID="tickets-faq-banner"
          role="button"
          aria-label={t('mweb.supportTickets.readFaqs')}
          onPress={() => navigation.navigate('Faqs')}
          flexDirection="row"
          alignItems="center"
          gap={12}
          pressStyle={PRESS_STYLE.surface}
        >
          <IconDisc name="help-outline" />
          <Text flex={1} fontSize={15} fontWeight="600" color="$color">
            Maybe answered already?
          </Text>
          <MaterialIcons name="chevron-right" size={22} color={muted} />
        </SurfaceCard>

        <TicketForm
          initialName={me?.full_name || ''}
          initialEmail={me?.email || ''}
          podId={podId}
          podTitle={podTitle}
          onCreated={(id) => navigation.navigate('TicketDetails', { ticketId: id })}
        />

        <MyTicketsList />
      </RefreshScrollView>
    </StackScreen>
  );
}
