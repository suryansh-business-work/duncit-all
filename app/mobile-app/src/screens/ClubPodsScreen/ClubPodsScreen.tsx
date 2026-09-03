import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';
import { podRowStatusOptions, type PodRowStatusFilter } from '@duncit/utils';

import { PrimaryButton } from '@/components/PrimaryButton';
import { StackScreen } from '@/components/StackScreen';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { LoadMoreButton } from '@/components/club-admin/LoadMoreButton';
import { PageHeading } from '@/components/club-admin/PageHeading';
import { ClubPodRow } from '@/components/club-admin/pods/ClubPodRow';
import { useClubPodSheets } from '@/components/club-admin/pods/useClubPodSheets';
import { ChipSelectField } from '@/components/create-pod';
import { useClubAdminPods } from '@/hooks/useClubAdminPods';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translate } from '@/i18n/fallback';
import type { RootStackParamList } from '@/navigation/types';

/** The confirmation line: a delete just done, else what the editor did. */
function noticeText(kind: string | undefined, deleted: boolean, t: Translate): string | null {
  if (deleted) return t('clubAdmin.pods.podDeleted');
  if (kind === 'created') return t('clubAdmin.editor.podCreated');
  if (kind === 'updated') return t('clubAdmin.editor.podUpdated');
  return null;
}

/**
 * One club's pods — the twin of mWeb's /clubs/:clubId/pods (rule 27): every
 * stage, narrowed by the shared status filter, each row opening the same
 * actions the MUI table's row menu offers. The editor returns here with a
 * `notice` param, which is also what tells the list to re-read itself.
 */
export function ClubPodsScreen() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ClubPods'>>();
  const { clubId } = params;
  const [status, setStatus] = useState<PodRowStatusFilter>('');
  const [deleted, setDeleted] = useState(false);
  const pods = useClubAdminPods(clubId, status);
  const sheets = useClubPodSheets({
    clubId,
    refetch: pods.refetch,
    onDeleted: () => setDeleted(true),
  });
  const statusOptions = useMemo(() => podRowStatusOptions(t), [t]);
  const notice = noticeText(params.notice, deleted, t);
  const empty = !pods.isLoading && !pods.hasError && pods.rows.length === 0;

  // A save in the editor lands back here with fresh params; the list it
  // changed re-reads itself rather than showing the row it had before.
  const refetchRef = useRef(pods.refetch);
  refetchRef.current = pods.refetch;
  useEffect(() => {
    if (params.notice) refetchRef.current();
  }, [params]);

  return (
    <StackScreen title={t('mweb.meta.clubPods.title')} testID="club-pods-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={48}>
          <PageHeading
            title={t('clubAdmin.pods.clubPods')}
            subtitle={t('clubAdmin.pods.createEditDelete')}
          />
          <PrimaryButton
            testID="club-pods-new"
            label={t('clubAdmin.pods.newPod')}
            onPress={() => navigation.navigate('ClubPodEditor', { clubId })}
          />
          <ChipSelectField
            label={t('clubAdmin.pods.statusFilter')}
            options={statusOptions}
            value={status}
            onChange={(next) => setStatus(next as PodRowStatusFilter)}
            testID="club-pods-status"
          />
          {notice ? (
            <Text testID="club-pods-notice" fontSize={12.5} color="$success">
              {notice}
            </Text>
          ) : null}
          {sheets.deleteError ? (
            <Text testID="club-pods-delete-error" fontSize={12.5} color="$danger">
              {sheets.deleteError}
            </Text>
          ) : null}
          {pods.isLoading ? <Spinner testID="club-pods-loading" color="$primary" /> : null}
          {pods.hasError ? <LoadErrorNotice testID="club-pods-error" onRetry={pods.refetch} /> : null}
          {empty ? (
            <Text testID="club-pods-empty" fontSize={13} color="$muted">
              {t('clubAdmin.pods.noPods')}
            </Text>
          ) : null}
          {pods.rows.map((pod) => (
            <ClubPodRow
              key={pod.id}
              pod={pod}
              when={formatDateTime(pod.pod_date_time)}
              testID={`club-pod-${pod.id}`}
              onOpen={() => sheets.openPod(pod)}
              onActions={() => sheets.openActions(pod)}
            />
          ))}
          {pods.hasMore ? (
            <LoadMoreButton testID="club-pods-more" busy={pods.isLoadingMore} onPress={pods.loadMore} />
          ) : null}
        </YStack>
      </ScrollView>
      {sheets.sheets}
    </StackScreen>
  );
}
