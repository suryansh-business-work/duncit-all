import { Fragment } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import { SearchPill } from '@/components/pod-list/SearchPill';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { AdminClubsState } from '@/hooks/useClubAdminClubs';
import { useTranslation } from '@/hooks/useTranslation';
import { LoadErrorNotice } from '../LoadErrorNotice';
import { RowDivider } from '../NavRow';
import { AdminClubRow } from './AdminClubRow';

interface Props {
  state: AdminClubsState;
  /** The search box's text and setter — held by the screen, because the hook
   * that fetches on it lives there too. */
  query: string;
  onQuery: (next: string) => void;
  onOpenPods: (clubId: string) => void;
  onEdit: (clubId: string) => void;
}

/** "Your clubs" — every club the admin runs, as rows of one card above Club
 * Studio's pods. */
export function YourClubsSection({ state, query, onQuery, onOpenPods, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const empty = !state.isLoading && !state.hasError && state.clubs.length === 0;
  const searchLabel = t('clubAdmin.clubs.search');

  return (
    <YStack gap={12} testID="club-studio-clubs">
      <SectionHeader title={t('mweb.clubStudio.yourClubs')} />
      {/* Server-side: the list is capped at fifty, so filtering what is already
          on screen would hide clubs past the cap from the admin who runs most. */}
      <Field label={searchLabel} testID="club-studio-clubs-search">
        <XStack>
          <SearchPill
            testID="field-club-studio-clubs-search"
            ariaLabel={searchLabel}
            placeholder=""
            value={query}
            onChangeText={onQuery}
          />
        </XStack>
      </Field>
      <SurfaceCard padding={0} overflow="hidden">
        {state.isLoading ? (
          <YStack padding={20} alignItems="center">
            <Spinner
              role="progressbar"
              aria-label={t('mweb.a11y.loading')}
              testID="club-studio-clubs-loading"
              color="$primary"
            />
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
