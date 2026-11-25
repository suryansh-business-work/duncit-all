import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import type { QualityDetails } from './useLeadQuality';

/** A tinted notice, as the portal's info and warning alerts. */
function Notice({
  tone,
  children,
  testID,
}: Readonly<{ tone: 'info' | 'warning'; children: ReactNode; testID: string }>) {
  return (
    <YStack
      backgroundColor={tone === 'info' ? '$infoSoft' : '$warningSoft'}
      borderRadius={RADII.sm}
      padding="$3"
      gap="$1"
      role="alert"
      testID={testID}
    >
      {children}
    </YStack>
  );
}

interface Props {
  details: QualityDetails;
  /** Automatic checks the last recalculation or evidence save could not run, and why. */
  skipped: readonly string[];
  /** The last recalculation's failure, already worded. */
  error: string;
}

/** What to know before trusting the number: not scored, out of date, checks skipped, a failed recalculation. */
export function QualityNotices({ details, skipped, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const notScored = !details.result;
  const stale = !notScored && details.stale;
  return (
    <YStack gap="$2">
      {error ? <AuthAlert message={error} testID="lead-quality-action-error" /> : null}
      {notScored ? (
        <Notice tone="info" testID="lead-quality-not-scored">
          <Text>{t('crm.leadQualityTab.notScoredYet')}</Text>
        </Notice>
      ) : null}
      {stale ? (
        <Notice tone="warning" testID="lead-quality-stale">
          <Text>
            {t('crm.leadQualityTab.staleScore', {
              vars: { scored: details.scored_version ?? '—', published: details.published_version },
            })}
          </Text>
        </Notice>
      ) : null}
      {skipped.length > 0 ? (
        <Notice tone="warning" testID="lead-quality-skipped">
          <Text fontWeight="700">{t('crm.leadQualityTab.skippedTitle')}</Text>
          {skipped.map((reason) => (
            <Text key={reason}>{reason}</Text>
          ))}
        </Notice>
      ) : null}
    </YStack>
  );
}
