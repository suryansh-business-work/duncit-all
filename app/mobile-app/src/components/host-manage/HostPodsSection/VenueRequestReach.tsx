import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Text, XStack, YStack } from 'tamagui';
import { logs } from '@duncit/logs';

import { DuncitButton } from '@/components/DuncitButton';
import { VenueChatContactSheet } from '@/components/venue-chat/VenueChatContactSheet';
import { VenueChatRoomDocument } from '@/graphql/venue-chat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';

type Room = ResultOf<typeof VenueChatRoomDocument>['venueChatRoom'];

/**
 * Under a venue request: the venue's contact and the pod's venue chat, one tap
 * each, so the host can reach the venue while it decides. The contact is read
 * only when asked for — a list of requests never reads one per row. mWeb twin:
 * venue-requests/VenueRequestReach.
 */
export function VenueRequestReach({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [room, setRoom] = useState<Room | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const showContact = async () => {
    setFailed(false);
    if (room) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const data = await graphqlRequest(VenueChatRoomDocument, { podId }, { auth: true });
      setRoom(data.venueChatRoom);
      setOpen(true);
    } catch (error) {
      setFailed(true);
      logs.mobileApp.error('VenueRequestReach', 'loadContact', { error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack gap={6}>
      <XStack gap={8}>
        <DuncitButton
          testID={`venue-request-contact-${podId}`}
          label={t('availability.offers.chat.contact')}
          variant="outline"
          size="sm"
          loading={loading}
          icon={<MaterialIcons name="contact-phone" size={16} color={accent} />}
          onPress={() => fireAndForget(showContact())}
        />
        <DuncitButton
          testID={`venue-request-chat-${podId}`}
          label={t('mweb.venueChat.chatWithVenue')}
          variant="soft"
          size="sm"
          icon={<MaterialIcons name="chat-bubble-outline" size={16} color={accent} />}
          onPress={() => navigation.navigate('VenueChat', { podId })}
        />
      </XStack>
      {failed ? (
        <Text
          role="alert"
          fontSize={12}
          color="$danger"
          testID={`venue-request-contact-error-${podId}`}
        >
          {t('mweb.venueChat.loadFailed')}
        </Text>
      ) : null}
      <VenueChatContactSheet
        open={open}
        host={room?.host}
        venue={room?.venue}
        onClose={() => setOpen(false)}
        onViewProfile={(userId) => navigation.navigate('PublicProfile', { userId })}
        onViewVenue={(venueId) => navigation.navigate('VenueDetails', { venueId })}
      />
    </YStack>
  );
}
