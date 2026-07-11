import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, YStack } from 'tamagui';

import type { FaqItem } from '@/hooks/useLibrary';
import { SUPPORT_GRADIENTS } from './gradients';

interface FrequentlyAskedTileProps {
  faq: FaqItem;
  colors: readonly [string, string];
  onOpen: (faq: FaqItem) => void;
}

/** A single colourful gradient card for a top FAQ. */
function FrequentlyAskedTile({ faq, colors, onOpen }: Readonly<FrequentlyAskedTileProps>) {
  return (
    <YStack
      testID={`faq-card-${faq.id}`}
      role="button"
      aria-label={faq.question}
      onPress={() => onOpen(faq)}
      width={190}
      minHeight={130}
      borderRadius={18}
      overflow="hidden"
      pressStyle={{ opacity: 0.9 }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <YStack flex={1} padding={16} justifyContent="space-between" gap={12}>
        <MaterialIcons name="help-outline" size={22} color="#ffffff" style={styles.icon} />
        <Text fontSize={14} fontWeight="900" color="#ffffff" lineHeight={18}>
          {faq.question}
        </Text>
      </YStack>
    </YStack>
  );
}

interface FrequentlyAskedProps {
  faqs: FaqItem[];
  onOpen: (faq: FaqItem) => void;
}

/** Horizontal row of colourful "Frequently Asked" cards (top FAQs). RN twin of
 * mWeb's FrequentlyAsked. */
export function FrequentlyAsked({ faqs, onOpen }: Readonly<FrequentlyAskedProps>) {
  if (faqs.length === 0) return null;
  return (
    <YStack gap={8}>
      <Text
        fontSize={12}
        fontWeight="900"
        color="$muted"
        textTransform="uppercase"
        letterSpacing={0.5}
      >
        Frequently Asked
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 2 }}
      >
        {faqs.map((faq, index) => (
          <FrequentlyAskedTile
            key={faq.id}
            faq={faq}
            colors={SUPPORT_GRADIENTS[index % SUPPORT_GRADIENTS.length]!}
            onOpen={onOpen}
          />
        ))}
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  icon: { opacity: 0.9 },
});
