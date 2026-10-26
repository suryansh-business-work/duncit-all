import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { isVenueChatUnavailable, seenFacesByLine, venueChatCounterpart } from '@duncit/utils';

import { AppBackground } from '@/components/AppBackground';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatErrorBanner } from '@/components/chat/ChatErrorBanner';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { EmojiBar } from '@/components/chat/EmojiBar';
import { VenueChatHeaderBar } from '@/components/chat/VenueChatHeaderBar';
import { useOfferCards } from '@/components/venue-chat/useOfferCards';
import { useVenueChatLineMenu } from '@/components/venue-chat/useVenueChatLineMenu';
import { VenueChatClosed } from '@/components/venue-chat/VenueChatClosed';
import { VenueChatContactSheet } from '@/components/venue-chat/VenueChatContactSheet';
import { VenueChatLineItem } from '@/components/venue-chat/VenueChatLineItem';
import { VenueChatOfferPin } from '@/components/venue-chat/VenueChatOfferPin';
import { VenueChatResubmit } from '@/components/venue-chat/VenueChatResubmit';
import { OfferNoticeText } from '@/components/venue-offer/OfferNoticeText';
import { useChatImagePicker } from '@/hooks/useChatImagePicker';
import { useMe } from '@/hooks/useMe';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueChat } from '@/hooks/useVenueChat';
import { useVenueChatLineActions } from '@/hooks/useVenueChatLineActions';
import { useVenueChatMarkRead } from '@/hooks/useVenueChatMarkRead';
import { useVenueChatSocket } from '@/hooks/useVenueChatSocket';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

/** Where the emoji bar's pick goes: into the composer, or onto a line as a reaction. */
type EmojiTarget = { type: 'compose' } | { type: 'react'; id: string } | null;

/** `/venue-chat/:podId` — the private thread between a pod's hosts and the venue
 * it is booked at, where the two also bargain over the booking offer: the
 * group chat's list, bubbles and composer, each offer move drawn as its card
 * (answerable on the move waiting on the reader), the live offer and both
 * sides' counters left pinned under the header, reactions, edits and seen
 * faces on every line, and both sides' contacts one tap away. RN twin of
 * mWeb's VenueChatPage. */
export function VenueChatScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { podId } = useRoute<RouteProp<RootStackParamList, 'VenueChat'>>().params;
  const chat = useVenueChat(podId);
  const { room, messages, marks, error, setError } = chat;
  const meId = useMe().data?.me?.user_id;
  const venueSide = room?.my_side === 'VENUE';
  const pickImage = useChatImagePicker({ sendImage: chat.sendImage, onError: setError });
  const [text, setText] = useState('');
  const [emojiFor, setEmojiFor] = useState<EmojiTarget>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const listRef = useRef<ScrollView>(null);
  const ready = !chat.isLoading;
  const offers = useOfferCards(podId, room, messages, ready, marks);
  const lineActions = useVenueChatLineActions(chat);
  const menu = useVenueChatLineMenu({
    meId,
    actions: lineActions,
    onReact: (id) => setEmojiFor({ type: 'react', id }),
  });
  const faces = useMemo(() => seenFacesByLine(messages, marks, meId), [messages, marks, meId]);
  useVenueChatMarkRead({ podId, lines: messages, meId, ready: ready && !!room });

  useVenueChatSocket({
    podId: room?.pod_id ?? null,
    // An offer move arrives on the same event as a text line; its card re-reads the offer.
    onLine: (line) => chat.addLines([line]),
    onUpdate: chat.replaceLine,
    onRemove: chat.removeLine,
    onRead: chat.addMark,
    onJoinFailed: (code) =>
      setError(
        isVenueChatUnavailable(code)
          ? t('mweb.venueChat.unavailable')
          : t('mweb.venueChat.joinFailed'),
      ),
  });

  // Follow the newest line — never an older page put above the line being read.
  const newestId = messages.at(-1)?.id;
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [newestId]);

  // The error banner appears without focus moving to it, so say it (4.1.3).
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  // Back lands where each side opened the thread from.
  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(venueSide ? 'VenuePods' : 'HostManage');
  };
  const openProfile = (userId: string) => navigation.navigate('PublicProfile', { userId });
  const send = async () => {
    if (await chat.sendText(text)) setText('');
  };
  // A refused reaction is said in the banner; the line keeps the reactions it had.
  const react = (lineId: string, emoji: string) =>
    fireAndForget(lineActions.react(lineId, emoji).then((refused) => refused && setError(refused)));
  const pickEmoji = (emoji: string) => {
    if (emojiFor?.type === 'react') react(emojiFor.id, emoji);
    else setText((prev) => prev + emoji);
    setEmojiFor(null);
  };
  const closed = !chat.isLoading && (chat.loadFailed || !room);

  return (
    <YStack flex={1} testID="venue-chat-screen">
      <AppBackground />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <VenueChatHeaderBar
          counterpart={room ? venueChatCounterpart(room) : null}
          venueSide={venueSide}
          onBack={goBack}
          onContact={room ? () => setContactOpen(true) : undefined}
        />
        {closed ? (
          <VenueChatClosed unavailable={chat.unavailable} onBack={goBack} onRetry={chat.reload} />
        ) : (
          <>
            <VenueChatOfferPin offer={offers.live} side={offers.side} />
            <KeyboardScreen>
              <ChatErrorBanner error={error} onDismiss={() => setError(null)} />
              <OfferNoticeText
                notice={offers.notice}
                onDismiss={offers.clearNotice}
                testID="venue-chat-offer-notice"
              />
              <ChatMessageList
                listRef={listRef}
                isLoading={chat.isLoading}
                messages={messages}
                history={chat.history}
                meId={meId}
                emptyText={
                  venueSide ? t('mweb.venueChat.emptyVenue') : t('mweb.venueChat.emptyHost')
                }
                renderMessage={(line) => (
                  <VenueChatLineItem
                    line={line}
                    meId={meId}
                    faces={faces.get(line.id)}
                    renderCard={offers.renderCard}
                    onOpenActions={menu.open}
                    onToggleReaction={react}
                    onOpenProfile={openProfile}
                  />
                )}
              />
              {emojiFor ? <EmojiBar onSelect={pickEmoji} /> : null}
              <ChatComposer
                value={text}
                onChangeText={setText}
                onSend={() => fireAndForget(send())}
                onPickImage={() => fireAndForget(pickImage())}
                onToggleEmoji={() =>
                  setEmojiFor((prev) => (prev?.type === 'compose' ? null : { type: 'compose' }))
                }
                sending={chat.sending}
              />
            </KeyboardScreen>
          </>
        )}
        <VenueChatResubmit
          podId={podId}
          move={offers.newOffer}
          onClose={offers.closeNewOffer}
          onError={setError}
        />
      </SafeAreaView>
      {menu.sheets}
      <VenueChatContactSheet
        open={contactOpen}
        host={room?.host}
        venue={room?.venue}
        onClose={() => setContactOpen(false)}
        onViewProfile={openProfile}
        onViewVenue={(venueId) => navigation.navigate('VenueDetails', { venueId })}
      />
    </YStack>
  );
}
