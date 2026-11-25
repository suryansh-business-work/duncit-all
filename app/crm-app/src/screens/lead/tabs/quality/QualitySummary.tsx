import { Text, XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import {
  CRM_QUALIFICATION_KEY,
  CRM_QUALIFICATION_TONE,
  CRM_VERIFICATION_KEY,
  crmFormatPoints,
  crmKeyOr,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ToneChip } from '@/components/ToneChip';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import { QualityGates } from './QualityGates';
import { QualityNotices } from './QualityNotices';
import { QualityRing } from './QualityRing';
import type { LeadQualityState, QualityDetails, QualityResult } from './useLeadQuality';

function ResultFacts({ result }: Readonly<{ result: QualityResult }>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$1">
      <XStack gap="$2" flexWrap="wrap">
        <ToneChip
          label={t(
            crmKeyOr(
              CRM_QUALIFICATION_KEY,
              result.qualification,
              'crm.leadQuality.pendingVerification',
            ),
          )}
          tone={CRM_QUALIFICATION_TONE[result.qualification] ?? 'default'}
          testID="lead-quality-qualification"
        />
        <ToneChip
          label={t(
            crmKeyOr(
              CRM_VERIFICATION_KEY,
              result.verification,
              'crm.leadQuality.verificationPending',
            ),
          )}
          tone="default"
          testID="lead-quality-verification"
        />
      </XStack>
      <Text color="$muted">
        {t('crm.leadQualityTab.itemCounts', {
          vars: {
            verified: result.verified_items,
            pending: result.pending_items,
            failed: result.failed_items,
          },
        })}
      </Text>
      {result.potential_score > result.score ? (
        <Text color="$muted">
          {t('crm.leadQualityTab.potentialScore', {
            vars: { score: crmFormatPoints(result.potential_score) },
          })}
        </Text>
      ) : null}
      <Text color="$muted">
        {result.min_qualification_score == null
          ? t('crm.leadQualityTab.qualifiesOnGates')
          : t('crm.leadQualityTab.qualifiesAt', {
              vars: { score: crmFormatPoints(result.min_qualification_score) },
            })}
      </Text>
    </YStack>
  );
}

/** The score at a glance: the ring, its classification, qualification, verification, gates and the recalculate actions. */
export function QualitySummary({
  details,
  actions,
}: Readonly<{ details: QualityDetails; actions: LeadQualityState }>) {
  const { t } = useTranslation();
  const { result } = details;
  const busy = actions.running !== null;
  const run = (mode: 'recalculate' | 'reverify') =>
    fireAndForget(actions.recalculate(mode), logs.mobileApp, 'crm-app/LeadQualityTab', mode);
  return (
    <YStack
      backgroundColor="$surface"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      padding="$4"
      gap="$3"
    >
      <XStack gap="$3" alignItems="center">
        <QualityRing
          size="large"
          score={result?.score ?? null}
          tone={result?.tone}
          label={result?.classification_label}
        />
        <YStack flex={1} gap="$1">
          <Text fontSize="$6" fontWeight="800" role="heading" testID="lead-quality-classification">
            {result ? result.classification_label : t('crm.leadQuality.notScored')}
          </Text>
          {details.scored_at ? (
            <Text color="$muted" fontSize="$2">
              {t('crm.leadQualityTab.scoredAt', {
                vars: {
                  date: displayDateTime(details.scored_at),
                  version: details.scored_version ?? '—',
                },
              })}
            </Text>
          ) : null}
        </YStack>
      </XStack>
      {result ? <ResultFacts result={result} /> : null}
      <XStack gap="$2" flexWrap="wrap">
        <DuncitButton
          label={t('crm.leadQualityTab.recalculate')}
          onPress={() => run('recalculate')}
          loading={actions.running === 'recalculate'}
          disabled={busy}
          testID="lead-quality-recalculate"
        />
        <DuncitButton
          label={t('crm.leadQualityTab.reverify')}
          onPress={() => run('reverify')}
          variant="outline"
          loading={actions.running === 'reverify'}
          disabled={busy}
          testID="lead-quality-reverify"
        />
      </XStack>
      <Text color="$muted" fontSize="$2">
        {t('crm.leadQualityTab.reverifyHint')}
      </Text>
      <QualityNotices details={details} skipped={actions.skipped} error={actions.error} />
      {result ? <QualityGates gates={result.gates} /> : null}
    </YStack>
  );
}
