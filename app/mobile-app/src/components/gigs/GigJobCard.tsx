import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import {
  gigBudgetText,
  gigEventTypeKey,
  gigPosterRoleKey,
  gigStatusKey,
  type GigJobRow,
} from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

const MAX_ROLES = 3;

function Pill({ label }: Readonly<{ label: string }>) {
  return (
    <XStack paddingHorizontal={10} paddingVertical={3} borderRadius={999} backgroundColor="$soft">
      <Text fontSize={11.5} fontWeight="600" color="$color">
        {label}
      </Text>
    </XStack>
  );
}

/** One gig on the board or in My posts. mWeb twin: @duncit/gig-jobs GigJobCard. */
export function GigJobCard({ job, onOpen }: Readonly<{ job: GigJobRow; onOpen: () => void }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { muted } = useThemeColors();
  const date = job.event_date
    ? fmt.formatDay(job.event_date.slice(0, 10))
    : t('gigJobs.card.noDate');
  const extra = job.roles.length - MAX_ROLES;

  return (
    <YStack
      onPress={onOpen}
      role="button"
      aria-label={job.title}
      pressStyle={PRESS_STYLE.control}
      testID={`gig-card-${job.id}`}
    >
      <SurfaceCard gap={6}>
        <XStack gap={6} flexWrap="wrap">
          <Pill label={job.category_title} />
          <Pill label={t(gigEventTypeKey(job.event_type))} />
          {job.status === 'OPEN' ? null : <Pill label={t(gigStatusKey(job.status))} />}
          {job.is_mine ? <Pill label={t('gigJobs.card.mine')} /> : null}
          {job.viewer_interested ? <Pill label={t('gigJobs.card.shared')} /> : null}
        </XStack>
        <Text fontSize={15} fontWeight="700" color="$color">
          {job.title}
        </Text>
        <Text fontSize={13} color="$muted" numberOfLines={1}>
          {job.roles.slice(0, MAX_ROLES).join(' · ')}
          {extra > 0 ? ` +${extra}` : ''}
        </Text>
        <XStack gap={12} flexWrap="wrap" alignItems="center">
          <XStack gap={4} alignItems="center">
            <MaterialIcons name="event" size={14} color={muted} />
            <Text fontSize={12.5} color="$muted">
              {date}
            </Text>
          </XStack>
          <XStack gap={4} alignItems="center">
            <MaterialIcons name="place" size={14} color={muted} />
            <Text fontSize={12.5} color="$muted">
              {job.city}
            </Text>
          </XStack>
        </XStack>
        <XStack gap={12} flexWrap="wrap">
          <Text fontSize={13} fontWeight="700" color="$color">
            {gigBudgetText(job.budget) ?? t('gigJobs.card.budgetOpen')}
          </Text>
          <Text fontSize={12.5} color="$muted">
            {t('gigJobs.card.openings', { count: job.openings })}
          </Text>
          <Text fontSize={12.5} color="$muted">
            {t('gigJobs.card.interested', { count: job.interest_count })}
          </Text>
        </XStack>
        <Text fontSize={12} color="$muted">
          {t('gigJobs.card.postedBy', {
            vars: { name: job.poster_name, role: t(gigPosterRoleKey(job.poster_role)) },
          })}
        </Text>
      </SurfaceCard>
    </YStack>
  );
}
