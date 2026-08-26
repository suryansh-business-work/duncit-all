import { Text, YStack } from 'tamagui';
import { POD_FEEDBACK_REMINDER_OPTIONS, type PodFeedbackReminderChoice } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface ButtonProps {
  label: string;
  /** LATER is the gentler answer, so it is the filled one. */
  primary: boolean;
  testID: string;
  onPress: () => void;
}

function ReminderButton({ label, primary, testID, onPress }: Readonly<ButtonProps>) {
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      height={42}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      borderWidth={primary ? 0 : 1}
      borderColor="$borderColor"
      backgroundColor={primary ? '$primary' : 'transparent'}
    >
      <Text fontSize={14} fontWeight="600" color={primary ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </YStack>
  );
}

interface Props {
  /** The pod being closed on — named in the body so the choice is unambiguous. */
  title: string;
  onChoose: (choice: PodFeedbackReminderChoice) => void;
}

/**
 * The second question, asked when a guest closes the rating prompt without
 * answering it: may we ask about this pod again?
 *
 * It exists because a dismiss that is only remembered in memory is a dismiss
 * that comes straight back the next time the app opens. Both answers are
 * written to the server — "next time" as a snooze, "never" as the end of it.
 *
 * The twin of mWeb's dialog (rule 27): the same two options in the same order,
 * from POD_FEEDBACK_REMINDER_OPTIONS, and the same words.
 */
export function PodFeedbackReminder({ title, onChoose }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <YStack
      testID="pod-feedback-reminder"
      width="100%"
      maxWidth={360}
      gap={12}
      padding={20}
      borderRadius={16}
      backgroundColor="$background"
    >
      <Text fontSize={16} fontWeight="700" color="$color">
        {t('mweb.podFeedback.remindTitle')}
      </Text>
      <Text fontSize={12} color="$muted">
        {t('mweb.podFeedback.remindBody', { vars: { title } })}
      </Text>

      {POD_FEEDBACK_REMINDER_OPTIONS.map((option) => (
        <ReminderButton
          key={option.choice}
          label={t(option.labelKey)}
          primary={option.choice === 'LATER'}
          testID={`pod-feedback-remind-${option.choice.toLowerCase()}`}
          onPress={() => onChoose(option.choice)}
        />
      ))}
    </YStack>
  );
}
