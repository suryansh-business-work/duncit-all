import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface FaqFeedbackProps {
  faqId: string;
  helpful: boolean;
  onToggleHelpful: (faqId: string) => void;
  onNotHelpful: () => void;
}

/** The Helpful / Not really row under an FAQ answer. Helpful shows a thumbs-up
 * on that FAQ; Not really asks the screen to open the still-need-help dialog.
 * Tamagui twin of mWeb's FaqFeedback. */
export function FaqFeedback({
  faqId,
  helpful,
  onToggleHelpful,
  onNotHelpful,
}: Readonly<FaqFeedbackProps>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const thumb = helpful ? (
    <MaterialIcons
      testID={`faq-${faqId}-helpful-mark`}
      name="thumb-up"
      size={16}
      color={onPrimary}
    />
  ) : undefined;

  return (
    <XStack gap={8} marginTop={4}>
      <DuncitButton
        testID={`faq-${faqId}-helpful`}
        label={t('mweb.faqsPage.helpful')}
        size="sm"
        variant={helpful ? 'solid' : 'soft'}
        tone={helpful ? 'primary' : 'neutral'}
        icon={thumb}
        onPress={() => onToggleHelpful(faqId)}
      />
      <DuncitButton
        testID={`faq-${faqId}-not-helpful`}
        label={t('mweb.faqsPage.notReally')}
        size="sm"
        variant="soft"
        tone="neutral"
        onPress={onNotHelpful}
      />
    </XStack>
  );
}
