import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';
import {
  splitAutoPods,
  type AutoPodLabels,
  type AutoPodRole,
  type AutoPodRow,
} from '@duncit/utils';

import { LoadingIndicator } from '@/components/LoadingIndicator';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { AutoPodCard } from '@/components/auto-pods/AutoPodCard';

interface SectionProps {
  heading: string;
  rows: AutoPodRow[];
  labels: AutoPodLabels;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  renderAction: (row: AutoPodRow) => ReactNode;
}

/** One titled block of cards. Hoisted to module scope so it is never redefined
 * per render of the queue (S6478). */
function AutoPodSection({
  heading,
  rows,
  labels,
  formatWhen,
  formatMoney,
  renderAction,
}: Readonly<SectionProps>) {
  if (rows.length === 0) return null;
  return (
    <YStack gap={10}>
      <Text fontSize={12.5} fontWeight="700" color="$muted">
        {heading}
      </Text>
      {rows.map((row) => (
        <AutoPodCard
          key={row.id}
          row={row}
          labels={labels}
          formatWhen={formatWhen}
          formatMoney={formatMoney}
          action={renderAction(row)}
        />
      ))}
    </YStack>
  );
}

interface Props {
  role: AutoPodRole;
  rows: AutoPodRow[];
  labels: AutoPodLabels;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  /** The role's button for a row it can still act on. */
  renderAction: (row: AutoPodRow) => ReactNode;
  /** Anything to show on a row this viewer already enrolled in (e.g. a pod link). */
  renderMineAction?: (row: AutoPodRow) => ReactNode;
}

const noAction = () => null;

/**
 * A role's whole Auto Pod queue: what is waiting on them (enrolment runs venue
 * → host → club admin, so an offer reaches a host only once a venue has fixed
 * a slot, and a club admin once a host is on it), then what they already
 * enrolled in — the venue's "Assigned slot", the host's "Assigned Auto Pods",
 * the club admin's "Final assigned Auto Pods". Both sections render the same
 * card, so a venue watching its accepted offer sees exactly what a host does.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `AutoPodQueue` (rule 27) — same two
 * sections, same order, same empty/error wording, split by the same
 * `splitAutoPods()` helper.
 */
export function AutoPodQueue({
  role,
  rows,
  labels,
  loading,
  error,
  onRetry,
  formatWhen,
  formatMoney,
  renderAction,
  renderMineAction,
}: Readonly<Props>) {
  if (loading) return <LoadingIndicator />;

  if (error) {
    return (
      <YStack gap={12}>
        <Text testID="auto-pods-error" fontSize={13} color="$danger">
          {labels.loadFailed}
        </Text>
        <PillButton
          testID="auto-pods-retry"
          label={labels.retry}
          onPress={onRetry}
          variant="ghost"
          disabled={false}
        />
      </YStack>
    );
  }

  const { actionable, mine } = splitAutoPods(rows, role);
  if (actionable.length === 0 && mine.length === 0) {
    return (
      <Text testID="auto-pods-empty" fontSize={13} color="$muted">
        {labels.empty(role)}
      </Text>
    );
  }

  return (
    <YStack gap={20}>
      <AutoPodSection
        heading={labels.needsAction}
        rows={actionable}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        renderAction={renderAction}
      />
      <AutoPodSection
        heading={labels.assignedHeading(role)}
        rows={mine}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        renderAction={renderMineAction ?? noAction}
      />
    </YStack>
  );
}
