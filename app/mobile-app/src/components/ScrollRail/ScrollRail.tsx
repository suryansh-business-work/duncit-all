import { useRef, useState, type ReactNode } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView as RNScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, View, YStack } from 'tamagui';
import { PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export interface ScrollRailProps {
  children: ReactNode;
  testID: string;
  gap?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  /** Cross-axis alignment of the row; default 'stretch'. */
  alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end';
}

const EDGE_TOLERANCE = 4;
const ARROW_SIZE = 32;
const SCROLL_PAGE_RATIO = 0.85;

interface ScrollArrowProps {
  testID: string;
  direction: 'left' | 'right';
  label: string;
  visible: boolean;
  color: string;
  surface: string;
  onPress: () => void;
}

/** Hoisted to module scope (S6478) — the outer stretch-to-fill box centers a
 * fixed-size circle without depending on the row's card height. */
function ScrollArrow({
  testID,
  direction,
  label,
  visible,
  color,
  surface,
  onPress,
}: Readonly<ScrollArrowProps>) {
  const hitSlop = Math.max(0, (TOUCH_TARGET - ARROW_SIZE) / 2);
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={!visible}
      tabIndex={0}
      hitSlop={hitSlop}
      onPress={visible ? onPress : undefined}
      position="absolute"
      top={0}
      bottom={0}
      {...(direction === 'left' ? { left: 4 } : { right: 4 })}
      width={ARROW_SIZE}
      alignItems="center"
      justifyContent="center"
      opacity={visible ? 1 : 0}
      pointerEvents={visible ? 'auto' : 'none'}
      pressStyle={PRESS_STYLE.ghost}
      hoverStyle={PRESS_STYLE.ghost}
    >
      <View
        width={ARROW_SIZE}
        height={ARROW_SIZE}
        borderRadius={ARROW_SIZE / 2}
        alignItems="center"
        justifyContent="center"
        backgroundColor={surface}
        shadowColor="#000"
        shadowOpacity={0.15}
        shadowRadius={4}
        shadowOffset={{ width: 0, height: 2 }}
      >
        <MaterialIcons
          name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
          size={20}
          color={color}
        />
      </View>
    </YStack>
  );
}

/**
 * Native twin of `@duncit/ui`'s `ScrollRail`: a sideways-scrolling row of
 * cards with left/right arrow buttons layered over its edges. Touch already
 * swipes the row; the arrows are an equal-parity control (CLAUDE.md rule 27)
 * that fade individually at whichever edge has nothing left to scroll to.
 */
export function ScrollRail({
  children,
  testID,
  gap = 12,
  paddingHorizontal = 0,
  paddingVertical = 0,
  alignItems = 'stretch',
}: Readonly<ScrollRailProps>) {
  const { t } = useTranslation();
  const { surface, color } = useThemeColors();
  const scrollRef = useRef<RNScrollView>(null);
  const containerWidth = useRef(0);
  const contentWidth = useRef(0);
  const offsetX = useRef(0);
  const [scrollable, setScrollable] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const evaluate = () => {
    setScrollable(contentWidth.current > containerWidth.current + EDGE_TOLERANCE);
    setCanScrollLeft(offsetX.current > EDGE_TOLERANCE);
    setCanScrollRight(
      offsetX.current + containerWidth.current < contentWidth.current - EDGE_TOLERANCE,
    );
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    containerWidth.current = event.nativeEvent.layout.width;
    evaluate();
  };

  const handleContentSizeChange = (width: number) => {
    contentWidth.current = width;
    evaluate();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetX.current = event.nativeEvent.contentOffset.x;
    evaluate();
  };

  const scrollByPage = (direction: 1 | -1) => {
    const target = Math.max(
      0,
      offsetX.current + direction * containerWidth.current * SCROLL_PAGE_RATIO,
    );
    scrollRef.current?.scrollTo({ x: target, animated: true });
  };

  return (
    <View position="relative">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ gap, paddingHorizontal, paddingVertical, alignItems }}
        testID={testID}
      >
        {children}
      </ScrollView>
      {scrollable && (
        <ScrollArrow
          testID={`${testID}-scroll-prev`}
          direction="left"
          label={t('ui.scrollRail.previous')}
          visible={canScrollLeft}
          color={color}
          surface={surface}
          onPress={() => scrollByPage(-1)}
        />
      )}
      {scrollable && (
        <ScrollArrow
          testID={`${testID}-scroll-next`}
          direction="right"
          label={t('ui.scrollRail.next')}
          visible={canScrollRight}
          color={color}
          surface={surface}
          onPress={() => scrollByPage(1)}
        />
      )}
    </View>
  );
}
