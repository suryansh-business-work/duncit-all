import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { ClubPodDetail } from '@/hooks/useClubPodDetail';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';

interface LifecycleStep {
  key: string;
  label: string;
  /** ISO date, or null when the pod has not reached this step. */
  when: string | null;
  done: boolean;
  /** The pod ended badly — the last dot goes red with a cross. */
  failed: boolean;
}

/** The three lifecycle steps and which of them this pod has reached. Same
 * precedence `@duncit/pod-details`' `lifecycleOf` applies (rule 27). */
function lifecycleOf(pod: ClubPodDetail, t: Translate): LifecycleStep[] {
  const cancelled = Boolean(pod.is_deleted);
  const finished = cancelled || Boolean(pod.completed_at);
  const started = new Date(pod.pod_date_time).getTime() <= Date.now();
  const endedAt = cancelled ? pod.deleted_at : pod.completed_at;
  const endLabel = cancelled
    ? t('podDetailsPanel.common.cancelled')
    : t('podDetailsPanel.common.completed');

  return [
    {
      key: 'created',
      label: t('podDetailsPanel.common.created'),
      when: pod.created_at,
      done: true,
      failed: false,
    },
    {
      key: 'date',
      label: t('podDetailsPanel.podTimelineSection.podDate'),
      when: pod.pod_date_time,
      done: started,
      failed: false,
    },
    {
      key: 'end',
      label: endLabel,
      when: finished ? (endedAt ?? null) : null,
      done: finished,
      failed: cancelled,
    },
  ];
}

interface StepProps {
  step: LifecycleStep;
  /** The stamped date, or the word for a step nothing has happened at yet. */
  when: string;
  /** Resolved dot colour, decided once in the parent. */
  dotColor: string;
  /** The glyph inside the dot — white on a reached step, absent otherwise. */
  glyph: string;
}

/** One column of the strip: the dot, the step's name and when it happened. */
function LifecycleStepColumn({ step, when, dotColor, glyph }: Readonly<StepProps>) {
  return (
    <YStack
      flex={1}
      minWidth={0}
      alignItems="center"
      gap={6}
      testID={`club-pod-detail-step-${step.key}`}
    >
      <XStack
        width={28}
        height={28}
        borderRadius={14}
        alignItems="center"
        justifyContent="center"
        backgroundColor={dotColor}
      >
        {step.done ? (
          <MaterialIcons name={step.failed ? 'close' : 'check'} size={18} color={glyph} />
        ) : null}
      </XStack>
      <Text fontSize={12} fontWeight="600" color="$color" textAlign="center" numberOfLines={2}>
        {step.label}
      </Text>
      <Text fontSize={11} color="$muted" textAlign="center" numberOfLines={2}>
        {when}
      </Text>
    </YStack>
  );
}

/**
 * Created → Pod date → Completed / Cancelled, as three equal columns.
 *
 * The Tamagui twin of `@duncit/pod-details`' `PodLifecycleStrip` (rule 27):
 * the same three steps, read from the same pod fields in the same order.
 */
export function PodDetailLifecycle({ pod }: Readonly<{ pod: ClubPodDetail }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { success, danger, soft, onPrimary, onDanger } = useThemeColors();
  const pending = t('podDetailsPanel.podTimelineSection.pending');

  return (
    <XStack alignItems="flex-start" gap={4} paddingVertical={4}>
      {lifecycleOf(pod, t).map((step) => {
        const reached = step.failed ? danger : success;
        return (
          <LifecycleStepColumn
            key={step.key}
            step={step}
            when={step.when ? formatDateTime(step.when) : pending}
            dotColor={step.done ? reached : soft}
            glyph={step.failed ? onDanger : onPrimary}
          />
        );
      })}
    </XStack>
  );
}
