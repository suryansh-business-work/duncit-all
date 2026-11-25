import type { ResultOf } from '@graphql-typed-document-node/core';
import { Text, XStack, YStack } from 'tamagui';
import type { CrmTone } from '@duncit/utils';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { StatGrid } from '@/components/StatGrid';
import { ToneChip } from '@/components/ToneChip';
import { RADII } from '@/constants/design';
import { displayDateTime } from '@/features/reminders/reminderTime';
import type { CrmAppDiscoveryJobsDocument } from '@/graphql/leadResearch';
import { useTranslation } from '@/hooks/useTranslation';

type Job = ResultOf<typeof CrmAppDiscoveryJobsDocument>['crmLeadDiscoveryJobs'][number];

/** The portal's status copy and colour per job status. */
const STATUS: Record<string, { key: string; tone: CrmTone }> = {
  RUNNING: { key: 'crm.leadResearch.jobRunning', tone: 'info' },
  COMPLETED: { key: 'crm.leadResearch.jobCompleted', tone: 'success' },
  FAILED: { key: 'crm.leadResearch.jobFailed', tone: 'error' },
  CANCELLED: { key: 'crm.leadResearch.jobCancelled', tone: 'default' },
};

interface Props {
  job: Job;
  onShow: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

/** One discovery: what it looks for, how far it got, what it found, and what can be done with it. */
export function DiscoveryJobCard({ job, onShow, onCancel, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  const status = STATUS[job.status] ?? { key: job.status, tone: 'default' as const };
  const share = job.total > 0 ? Math.min(1, job.succeeded / job.total) : 0;
  return (
    <Card testID={`job-${job.id}`}>
      <XStack alignItems="center" gap="$2">
        <Text flex={1} fontWeight="700">
          {job.label}
        </Text>
        <ToneChip label={t(status.key)} tone={status.tone} />
      </XStack>
      <Text color="$muted" fontSize="$2">
        {t('crm.leadResearch.jobStartedAt', { vars: { started: displayDateTime(job.created_at) } })}
      </Text>
      <YStack
        gap="$1"
        accessible
        aria-label={t('crm.leadResearch.jobProgress', {
          vars: { found: job.succeeded, total: job.total },
        })}
      >
        <Text fontSize="$2">
          {t('crm.leadResearch.jobProgress', { vars: { found: job.succeeded, total: job.total } })}
        </Text>
        <XStack height={8} borderRadius={RADII.pill} backgroundColor="$soft" overflow="hidden">
          <YStack width={`${share * 100}%`} backgroundColor="$accentText" />
        </XStack>
      </YStack>
      <StatGrid
        items={[
          {
            key: `${job.id}-found`,
            label: t('crm.leadResearch.statFound'),
            value: job.stats.found,
          },
          {
            key: `${job.id}-saved`,
            label: t('crm.leadResearch.statSaved'),
            value: job.stats.saved,
          },
          {
            key: `${job.id}-qualifying`,
            label: t('crm.leadResearch.statQualifying'),
            value: job.stats.qualifying,
          },
          {
            key: `${job.id}-duplicates`,
            label: t('crm.leadResearch.statDuplicates'),
            value: job.stats.duplicates,
          },
        ]}
      />
      {job.error_message ? (
        <Text color="$danger" fontSize="$2">
          {job.error_message}
        </Text>
      ) : null}
      <XStack gap="$2" flexWrap="wrap">
        <DuncitButton
          label={t('crm.leadResearch.showCandidates')}
          onPress={onShow}
          size="sm"
          variant="outline"
          testID={`job-show-${job.id}`}
        />
        {job.status === 'RUNNING' ? (
          <DuncitButton
            label={t('crm.leadResearch.cancelDiscovery')}
            onPress={onCancel}
            size="sm"
            variant="ghost"
            tone="danger"
            testID={`job-cancel-${job.id}`}
          />
        ) : null}
        {job.status === 'FAILED' || job.status === 'CANCELLED' ? (
          <DuncitButton
            label={t('crm.leadResearch.retryDiscovery')}
            onPress={onRetry}
            size="sm"
            variant="ghost"
            testID={`job-retry-${job.id}`}
          />
        ) : null}
      </XStack>
    </Card>
  );
}
