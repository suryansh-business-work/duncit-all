import { Text, XStack, YStack } from 'tamagui';
import {
  gigBudgetText,
  gigEventTypeKey,
  gigPosterRoleKey,
  gigStatusKey,
  type GigJob,
} from '@duncit/utils';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <YStack gap={2} minWidth={120}>
      <Text fontSize={11.5} color="$muted">
        {label}
      </Text>
      <Text fontSize={13.5} color="$color">
        {value}
      </Text>
    </YStack>
  );
}

/** What the gig is — mWeb twin: @duncit/gig-jobs GigJobFacts. */
export function GigFacts({ job }: Readonly<{ job: GigJob }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const when = job.event_date
    ? fmt.formatDay(job.event_date.slice(0, 10))
    : t('gigJobs.card.noDate');
  const where = [job.location, job.city].filter(Boolean).join(', ');

  return (
    <YStack gap={12}>
      <Text fontSize={12.5} fontWeight="600" color="$muted">
        {t(gigStatusKey(job.status))} · {t(gigEventTypeKey(job.event_type))}
      </Text>
      <Text fontSize={20} fontWeight="700" color="$color" role="heading">
        {job.title}
      </Text>
      <Text fontSize={13} color="$muted">
        {t('gigJobs.card.postedBy', {
          vars: { name: job.poster_name, role: t(gigPosterRoleKey(job.poster_role)) },
        })}
      </Text>
      <YStack gap={6}>
        <Text fontSize={13} fontWeight="700" color="$color">
          {t('gigJobs.detail.roles')}
        </Text>
        <XStack gap={6} flexWrap="wrap">
          {job.roles.map((role) => (
            <XStack
              key={role}
              paddingHorizontal={12}
              paddingVertical={5}
              borderRadius={999}
              backgroundColor="$soft"
            >
              <Text fontSize={12.5} color="$color">
                {role}
              </Text>
            </XStack>
          ))}
        </XStack>
      </YStack>
      <XStack gap={16} flexWrap="wrap">
        <Fact label={t('gigJobs.detail.category')} value={job.category_title} />
        <Fact label={t('gigJobs.detail.when')} value={when} />
        <Fact label={t('gigJobs.detail.where')} value={where} />
        <Fact
          label={t('gigJobs.detail.budget')}
          value={gigBudgetText(job.budget) ?? t('gigJobs.card.budgetOpen')}
        />
        <Fact label={t('gigJobs.detail.openings')} value={String(job.openings)} />
      </XStack>
      {job.description ? (
        <YStack gap={4}>
          <Text fontSize={13} fontWeight="700" color="$color">
            {t('gigJobs.detail.about')}
          </Text>
          <Text fontSize={13.5} color="$color">
            {job.description}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}
