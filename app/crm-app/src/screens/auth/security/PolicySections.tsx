import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import type { Challenge } from './useSecurityVerification';

/** The warning and the policies the user confirms, as the server sends them. */
export function PolicySections({ challenge }: Readonly<{ challenge: Challenge }>) {
  const { t } = useTranslation();
  return (
    <>
      {challenge.reverify ? (
        <Text color="$warning">{t('shell.securityVerification.reverify')}</Text>
      ) : null}
      <YStack backgroundColor="$infoSoft" borderRadius="$3" padding="$3">
        <Text fontWeight="700">{t('shell.securityVerification.warning.label')}</Text>
        <Text>{t('shell.securityVerification.warning.body')}</Text>
      </YStack>
      <YStack gap="$2">
        <Text fontWeight="700" role="heading">
          {t('shell.securityVerification.policies.title')}
        </Text>
        {challenge.sections.map((section) => (
          <YStack key={section.key} gap="$1">
            <Text fontWeight="600">{section.title}</Text>
            {section.paragraphs.map((p) => (
              <Text key={p} color="$muted">
                {p}
              </Text>
            ))}
          </YStack>
        ))}
      </YStack>
    </>
  );
}
