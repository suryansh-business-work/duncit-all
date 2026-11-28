import { Spinner, Text, XStack, YStack } from 'tamagui';

import { EmptyState, type IconName } from '@/components/mobile/EmptyState';
import { SkeletonRows } from '@/components/mobile/Skeleton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  loading?: boolean;
  /** A message to show with a retry; the generic one when `true`. */
  error?: string | boolean | null;
  /** Shown when there is nothing to list. */
  empty?: string | null;
  /** The empty state's icon; an empty tray by default. */
  emptyIcon?: IconName;
  /** A second line under the empty message: what to do about it. */
  emptyHint?: string;
  onRetry?: () => void;
  /**
   * A small spinner instead of the skeleton rows: for the next page at the foot
   * of a list, or a section inside a screen that is already drawn.
   */
  inline?: boolean;
  /** How many skeleton rows stand in for the content while it loads. */
  rows?: number;
}

/**
 * The loading, error and empty states every list and detail screen shares.
 * Loading draws skeleton rows in the content's shape (no full-screen spinner),
 * an error says what failed with a retry, and an empty list says so with an icon.
 * Renders nothing when none applies, so a screen can place it above its content.
 */
export function StateView({
  loading,
  error,
  empty,
  emptyIcon = 'inbox',
  emptyHint,
  onRetry,
  inline = false,
  rows = 4,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (loading) {
    if (inline) {
      return (
        <XStack padding="$4" justifyContent="center" gap="$2" aria-busy>
          <Spinner color="$accentText" />
          <Text color="$muted">{t('crmApp.common.loading')}</Text>
        </XStack>
      );
    }
    return (
      <YStack aria-label={t('crmApp.common.loading')}>
        <SkeletonRows rows={rows} />
      </YStack>
    );
  }
  if (error) {
    return (
      <EmptyState
        icon="cloud-off"
        tone="danger"
        title={typeof error === 'string' ? error : t('crmApp.common.loadFailed')}
        action={
          onRetry
            ? { label: t('shell.common.retry'), onPress: onRetry, testID: 'state-retry' }
            : undefined
        }
      />
    );
  }
  if (empty) {
    return <EmptyState icon={emptyIcon} title={empty} body={emptyHint} />;
  }
  return null;
}
