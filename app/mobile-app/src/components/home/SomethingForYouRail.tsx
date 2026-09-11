import { Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import {
  clampSomethingForYouTitle,
  resolveSomethingForYouTarget,
  SOMETHING_FOR_YOU_TITLE_LINES,
  type SomethingForYouTarget,
} from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { SectionHeader } from '@/components/SectionHeader';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useSomethingForYou, type SomethingForYouCard } from '@/hooks/useSomethingForYou';
import { fireAndForget } from '@/utils/fire-and-forget';

/** One card's footprint, and its corner. Matches mWeb so the two look like
 * one product — the radius is px on both sides, never a theme multiplier;
 * 18 is the calm design's media corner. */
const CARD_WIDTH = 168;
const CARD_HEIGHT = 232;
const CARD_RADIUS = 18;

/**
 * Carry out what a promo card was set to do — Home's `onOpen`. A ROUTE goes
 * through our own deep link, so the linking config decides which screen it is —
 * one map, not a second copy here that would drift the first time a route
 * moved. A URL is handed to the browser, which leaves the app: that is
 * precisely the distinction the admin toggle exists to make. (Moved here from
 * HomeFeed for its 200-line cap.)
 */
export function openSomethingForYouTarget(target: SomethingForYouTarget) {
  if (target.kind === 'route') {
    fireAndForget(Linking.openURL(Linking.createURL(target.path)));
    return;
  }
  if (target.kind === 'url') fireAndForget(Linking.openURL(target.url));
}

interface Props {
  /**
   * Carry out a card's action. A route goes through the app's own linking
   * config; an address is handed to the browser, which leaves the app — the
   * distinction the admin toggle exists to make.
   */
  onOpen: (target: SomethingForYouTarget) => void;
}

/**
 * The row that scrolls sideways at the bottom of Home.
 *
 * Tamagui twin of mWeb's rail: same query, same card size, same clamp on the
 * headline. Only the drawing differs — the rows, the limits and the ordering
 * are shared, which is what stops the two surfaces from drifting (rule 27).
 */
export function SomethingForYouRail({ onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const items = useSomethingForYou();
  if (items.length === 0) return null;

  return (
    <YStack gap={12}>
      <YStack paddingHorizontal={16}>
        <SectionHeader title={t('mweb.home.somethingForYou')} />
      </YStack>

      {/* The last card is deliberately cut off by the screen edge — with no
          scrollbar it is the only signal that the row moves. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {items.map((item) => (
          <SomethingForYouTile key={item.id} item={item} onOpen={onOpen} />
        ))}
      </ScrollView>
    </YStack>
  );
}

/** Hoisted rather than nested: a component defined inside another is remade on
 * every render, and this one holds an image. */
function SomethingForYouTile({
  item,
  onOpen,
}: Readonly<{ item: SomethingForYouCard; onOpen: (target: SomethingForYouTarget) => void }>) {
  const target = resolveSomethingForYouTarget(item);
  const opens = target.kind !== 'none';
  const { soft } = useThemeColors();
  return (
    <Pressable
      accessibilityRole={opens ? 'button' : 'image'}
      onPress={opens ? () => onOpen(target) : undefined}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: CARD_RADIUS,
        overflow: 'hidden',
        backgroundColor: soft,
      }}
    >
      <AppImage
        source={{ uri: item.image_url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        recyclingKey={item.id}
      />

      <Text
        position="absolute"
        top={12}
        left={12}
        right={12}
        fontSize={14}
        fontWeight="600"
        lineHeight={18}
        color="white"
        numberOfLines={SOMETHING_FOR_YOU_TITLE_LINES}
      >
        {clampSomethingForYouTitle(item.title)}
      </Text>

      {Boolean(item.bottom_text) && (
        <XStack
          position="absolute"
          left={0}
          right={0}
          bottom={0}
          paddingHorizontal={10}
          paddingVertical={8}
          justifyContent="center"
          backgroundColor="rgba(0,0,0,0.42)"
        >
          <Text fontSize={12} fontWeight="600" color="white" numberOfLines={1}>
            {item.bottom_text}
          </Text>
        </XStack>
      )}
    </Pressable>
  );
}
