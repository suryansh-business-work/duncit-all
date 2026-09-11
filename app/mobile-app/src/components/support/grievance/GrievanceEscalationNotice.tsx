import { MaterialIcons } from '@expo/vector-icons';
import { grievanceEscalationCopy } from '@duncit/i18n';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { GrievanceStepRow } from './GrievanceStepRow';

/**
 * Support first, grievance after — the ladder, as a timeline.
 *
 * The RN twin of mWeb's `GrievanceEscalationNotice` and of the block the
 * website renders above its own form. All three read the SAME three steps and
 * the SAME warning from `grievanceEscalationCopy`, because this is the sentence
 * a rejected grievance is measured against: a complainant told one thing in the
 * app and another on the website has a fair argument that they were misled.
 */
export function GrievanceEscalationNotice() {
  const { t } = useTranslation();
  const { warning } = useThemeColors();
  const copy = grievanceEscalationCopy(t);
  const lastIndex = copy.steps.length - 1;

  return (
    <SurfaceCard testID="grievance-escalation" gap={12}>
      <Text fontSize={16} fontWeight="600" color="$color">
        {copy.title}
      </Text>
      <YStack>
        {copy.steps.map((step, index) => (
          <GrievanceStepRow
            key={step.key}
            index={index}
            title={step.title}
            body={step.body}
            isLast={index === lastIndex}
          />
        ))}
      </YStack>
      <XStack
        testID="grievance-escalation-warning"
        gap={8}
        padding={12}
        borderRadius={14}
        backgroundColor="$soft"
      >
        <MaterialIcons name="warning-amber" size={18} color={warning} />
        <Text flex={1} fontSize={12} fontWeight="600" color="$color">
          {copy.warning}
        </Text>
      </XStack>
    </SurfaceCard>
  );
}
