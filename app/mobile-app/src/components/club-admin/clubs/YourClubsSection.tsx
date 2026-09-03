import { Spinner, Text, YStack } from 'tamagui';

import type { AdminClubsState } from '@/hooks/useClubAdminClubs';
import { useTranslation } from '@/hooks/useTranslation';
import { LoadErrorNotice } from '../LoadErrorNotice';
import { AdminClubRow } from './AdminClubRow';

interface Props {
  state: AdminClubsState;
  onOpenPods: (clubId: string) => void;
  onEdit: (clubId: string) => void;
}

/** "Your clubs" — every club the admin runs, above Club Studio's pods. */
export function YourClubsSection({ state, onOpenPods, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const empty = !state.isLoading && !state.hasError && state.clubs.length === 0;

  return (
    <YStack gap={12} testID="club-studio-clubs">
      <YStack gap={2}>
        <Text fontSize={16} fontWeight="700" color="$color">
          {t('mweb.clubStudio.yourClubs')}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {t('mweb.clubStudio.yourClubsSubtitle')}
        </Text>
      </YStack>
      {state.isLoading ? <Spinner testID="club-studio-clubs-loading" color="$primary" /> : null}
      {state.hasError ? (
        <LoadErrorNotice testID="club-studio-clubs-error" onRetry={state.refetch} />
      ) : null}
      {empty ? (
        <Text testID="club-studio-clubs-empty" fontSize={13} color="$muted">
          {t('mweb.clubStudio.noClubs')}
        </Text>
      ) : null}
      {state.clubs.map((club) => (
        <AdminClubRow
          key={club.id}
          club={club}
          testID={`club-studio-club-${club.id}`}
          onOpenPods={() => onOpenPods(club.id)}
          onEdit={() => onEdit(club.id)}
        />
      ))}
    </YStack>
  );
}
