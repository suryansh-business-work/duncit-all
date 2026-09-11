import { Fragment } from 'react';
import { Spinner, Text, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { AdminClubsState } from '@/hooks/useClubAdminClubs';
import { useTranslation } from '@/hooks/useTranslation';
import { LoadErrorNotice } from '../LoadErrorNotice';
import { RowDivider } from '../NavRow';
import { AdminClubRow } from './AdminClubRow';

interface Props {
  state: AdminClubsState;
  onOpenPods: (clubId: string) => void;
  onEdit: (clubId: string) => void;
}

/** "Your clubs" — every club the admin runs, as rows of one card above Club
 * Studio's pods. */
export function YourClubsSection({ state, onOpenPods, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const empty = !state.isLoading && !state.hasError && state.clubs.length === 0;

  return (
    <YStack gap={12} testID="club-studio-clubs">
      <SectionHeader title={t('mweb.clubStudio.yourClubs')} />
      <SurfaceCard padding={0} overflow="hidden">
        {state.isLoading ? (
          <YStack padding={20} alignItems="center">
            <Spinner testID="club-studio-clubs-loading" color="$primary" />
          </YStack>
        ) : null}
        {state.hasError ? (
          <YStack padding={16}>
            <LoadErrorNotice testID="club-studio-clubs-error" onRetry={state.refetch} />
          </YStack>
        ) : null}
        {empty ? (
          <Text testID="club-studio-clubs-empty" padding={16} fontSize={14} color="$muted">
            {t('mweb.clubStudio.noClubs')}
          </Text>
        ) : null}
        {state.clubs.map((club, index) => (
          <Fragment key={club.id}>
            {index > 0 ? <RowDivider /> : null}
            <AdminClubRow
              club={club}
              testID={`club-studio-club-${club.id}`}
              onOpenPods={() => onOpenPods(club.id)}
              onEdit={() => onEdit(club.id)}
            />
          </Fragment>
        ))}
      </SurfaceCard>
    </YStack>
  );
}
