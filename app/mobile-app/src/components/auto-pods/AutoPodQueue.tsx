import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';
import { autoPodQueueSections, type AutoPodCardChrome, type AutoPodRow } from '@duncit/utils';

import { LoadingIndicator } from '@/components/LoadingIndicator';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { AutoPodCard } from '@/components/auto-pods/AutoPodCard';

const noAction = () => null;
const NO_EARNINGS: Readonly<Record<string, number>> = {};

interface SectionProps extends AutoPodCardChrome {
  heading: string;
  rows: AutoPodRow[];
  renderAction: (row: AutoPodRow) => ReactNode;
  renderEarningsAction: (row: AutoPodRow) => ReactNode;
  earnings: Readonly<Record<string, number>>;
}

/** One titled block of cards, hoisted to module scope (S6478). */
function AutoPodSection({
  heading,
  rows,
  renderAction,
  renderEarningsAction,
  earnings,
  ...chrome
}: Readonly<SectionProps>) {
  return (
    <YStack gap={10}>
      <Text fontSize={12.5} fontWeight="700" color="$muted">
        {heading}
      </Text>
      {rows.map((row) => (
        <AutoPodCard
          key={row.id}
          row={row}
          action={renderAction(row)}
          earningsAction={renderEarningsAction(row)}
          earnings={earnings[row.id] ?? null}
          {...chrome}
        />
      ))}
    </YStack>
  );
}

interface Props extends AutoPodCardChrome {
  rows: AutoPodRow[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** The role's button for a row it can still act on. */
  renderAction: (row: AutoPodRow) => ReactNode;
  /** Anything to show on a row this viewer already enrolled in. */
  renderMineAction?: (row: AutoPodRow) => ReactNode;
  /** The row's "View Potential Earnings" control. */
  renderEarningsAction?: (row: AutoPodRow) => ReactNode;
  /** This viewer's own figures, by Auto Pod id — they beat the server's. */
  earnings?: Readonly<Record<string, number>>;
}

/**
 * A role's whole Auto Pod queue — the Tamagui twin of `@duncit/auto-pods`'
 * `AutoPodQueue` (rule 27): the same two sections in the same order, with the
 * same empty and error wording, because both ask `autoPodQueueSections()` in
 * `@duncit/utils` which blocks there are and what each is called.
 */
export function AutoPodQueue({
  rows,
  loading,
  error,
  onRetry,
  renderAction,
  renderMineAction,
  renderEarningsAction,
  earnings,
  ...chrome
}: Readonly<Props>) {
  if (loading) return <LoadingIndicator />;

  if (error) {
    return (
      <YStack gap={12}>
        <Text testID="auto-pods-error" fontSize={13} color="$danger">
          {chrome.labels.loadFailed}
        </Text>
        <PillButton
          testID="auto-pods-retry"
          label={chrome.labels.retry}
          onPress={onRetry}
          variant="ghost"
          disabled={false}
        />
      </YStack>
    );
  }

  const sections = autoPodQueueSections(rows, chrome.role, chrome.labels);
  if (sections.length === 0) {
    return (
      <Text testID="auto-pods-empty" fontSize={13} color="$muted">
        {chrome.labels.empty(chrome.role)}
      </Text>
    );
  }

  return (
    <YStack gap={20}>
      {sections.map((section) => (
        <AutoPodSection
          key={section.key}
          heading={section.heading}
          rows={section.rows}
          renderAction={
            section.key === 'actionable' ? renderAction : (renderMineAction ?? noAction)
          }
          renderEarningsAction={renderEarningsAction ?? noAction}
          earnings={earnings ?? NO_EARNINGS}
          {...chrome}
        />
      ))}
    </YStack>
  );
}
