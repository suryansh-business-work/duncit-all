import { Spinner, Text, YStack } from 'tamagui';
import type { GigJobRow } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from '@/hooks/useTranslation';
import { GigJobCard } from './GigJobCard';

interface Props {
  rows: readonly GigJobRow[] | null;
  total: number;
  loading: boolean;
  failed: boolean;
  emptyTitle: string;
  onRetry: () => void;
  onMore: () => void;
  onOpen: (id: string) => void;
}

/** A page of gigs with its loading, error, empty and "load more" states. mWeb twin: GigJobList. */
export function GigList({
  rows,
  total,
  loading,
  failed,
  emptyTitle,
  onRetry,
  onMore,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (failed && !rows) {
    return (
      <YStack gap={8}>
        <Text fontSize={13.5} color="$muted">
          {t('gigJobs.board.loadFailed')}
        </Text>
        <DuncitButton
          label={t('gigJobs.board.retry')}
          variant="outline"
          onPress={onRetry}
          testID="gig-list-retry"
        />
      </YStack>
    );
  }
  if (!rows) {
    return (
      <Spinner
        role="progressbar"
        aria-label={t('mweb.a11y.loading')}
        color="$primary"
        testID="gig-list-loading"
      />
    );
  }
  if (rows.length === 0) {
    return <EmptyState icon="work-outline" title={emptyTitle} testID="gig-list-empty" />;
  }
  return (
    <YStack gap={12}>
      {rows.map((job) => (
        <GigJobCard key={job.id} job={job} onOpen={() => onOpen(job.id)} />
      ))}
      {rows.length < total ? (
        <DuncitButton
          label={t('gigJobs.board.loadMore')}
          variant="outline"
          loading={loading}
          onPress={onMore}
          testID="gig-list-more"
        />
      ) : null}
    </YStack>
  );
}
