import { Text, YStack } from 'tamagui';
import { leadQualityIssueMessage, type LeadQualityIssueLike } from '@duncit/forms/schemas';

import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';

interface Props {
  title: string;
  hint?: string;
  /** Problems with the section's list as a whole (a total, a count, a missing band). */
  issues?: readonly LeadQualityIssueLike[];
  testID: string;
}

/** A section of the scoring model: its heading, what it means, and what is wrong with it as a whole. */
export function SectionHeading({ title, hint, issues = [], testID }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <YStack gap="$1">
        <Text fontWeight="700" fontSize="$5" role="heading">
          {title}
        </Text>
        {hint ? (
          <Text color="$muted" fontSize="$2">
            {hint}
          </Text>
        ) : null}
      </YStack>
      {issues.map((issue) => (
        <AuthAlert
          key={issue.code}
          message={leadQualityIssueMessage(t, issue)}
          testID={`${testID}-issue-${issue.code}`}
        />
      ))}
    </YStack>
  );
}
