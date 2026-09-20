import type { ReactNode } from 'react';
import { Spinner, Text, XStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { LoadErrorNotice } from '../LoadErrorNotice';
import { RowBadge } from '../NavRow';

interface Props {
  title: string;
  testID: string;
  /** The count beside the title — hidden at 0, like the MUI card's badge. */
  badge?: number;
  isLoading?: boolean;
  /** A failed load says so and offers Retry; never an empty state. */
  hasError?: boolean;
  onRetry?: () => void;
  /** The sentence shown when the section loaded and holds nothing. */
  emptyText?: string | null;
  children?: ReactNode;
}

/**
 * One card of the Club Admin's pod detail: a heading, an optional count, and
 * the four states every self-fetching section shares.
 *
 * The Tamagui twin of `@duncit/pod-details`' `SectionCard` (rule 27) — the
 * package is MUI, so the two cannot be one component, but neither may invent
 * its own loading, error or empty behaviour.
 */
export function PodDetailSection({
  title,
  testID,
  badge,
  isLoading = false,
  hasError = false,
  onRetry,
  emptyText,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const showBadge = typeof badge === 'number' && badge > 0;

  return (
    <SurfaceCard testID={testID} gap={12}>
      <XStack alignItems="center" gap={8}>
        {/* `role`, not `accessibilityRole`: Tamagui's web build forwards the
            RN-only prop to the DOM untouched, so Native Web loses the heading. */}
        <Text
          testID={`${testID}-title`}
          role="heading"
          flex={1}
          fontSize={16}
          fontWeight="600"
          color="$color"
          numberOfLines={1}
        >
          {title}
        </Text>
        {showBadge ? <RowBadge testID={`${testID}-badge`} label={String(badge)} /> : null}
      </XStack>
      {isLoading ? (
        <Spinner
          role="progressbar"
          aria-label={t('mweb.a11y.loading')}
          testID={`${testID}-loading`}
          color="$primary"
        />
      ) : null}
      {hasError && onRetry ? (
        <LoadErrorNotice testID={`${testID}-error`} onRetry={onRetry} />
      ) : null}
      {emptyText ? (
        <Text testID={`${testID}-empty`} fontSize={13} color="$muted">
          {emptyText}
        </Text>
      ) : null}
      {children}
    </SurfaceCard>
  );
}
