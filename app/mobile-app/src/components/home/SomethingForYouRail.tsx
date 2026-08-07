import { Image, Pressable } from 'react-native';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import {
  clampSomethingForYouTitle,
  resolveSomethingForYouTarget,
  SOMETHING_FOR_YOU_TITLE_LINES,
  type SomethingForYouTarget,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { useSomethingForYou, type SomethingForYouCard } from '@/hooks/useSomethingForYou';

/** One card's footprint. Matches mWeb so the two look like one product. */
const CARD_WIDTH = 168;
const CARD_HEIGHT = 232;

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
    <YStack gap={10}>
      <Text
        paddingHorizontal={16}
        fontSize={12}
        fontWeight="800"
        letterSpacing={0.8}
        textTransform="uppercase"
        color="$colorSubtle"
      >
        {t('mweb.home.somethingForYou')}
      </Text>

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
  return (
    <Pressable
      accessibilityRole={opens ? 'button' : 'image'}
      onPress={opens ? () => onOpen(target) : undefined}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <Image
        source={{ uri: item.image_url }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      <Text
        position="absolute"
        top={12}
        left={12}
        right={12}
        fontSize={14}
        fontWeight="800"
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
          <Text fontSize={12} fontWeight="700" color="white" numberOfLines={1}>
            {item.bottom_text}
          </Text>
        </XStack>
      )}
    </Pressable>
  );
}
