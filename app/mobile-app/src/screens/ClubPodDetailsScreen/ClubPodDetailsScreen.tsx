import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { NavRow } from '@/components/club-admin/NavRow';
import {
  PodDetailAttendees,
  PodDetailClub,
  PodDetailFeedback,
  PodDetailHosts,
  PodDetailOverview,
  PodDetailPayments,
  PodDetailSection,
  PodDetailTimeline,
} from '@/components/club-admin/pod-details';
import { useClubPodDetail } from '@/hooks/useClubPodDetail';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * A club admin's pod detail on the phone — the Tamagui twin of mWeb's
 * /clubs/:clubId/pods/:id and the Partners console's club-admin pod page,
 * which both mount `@duncit/pod-details` at CLUB_ADMIN scope (rule 27).
 *
 * Every section reads the CLUB-SCOPED twin of an admin query, gated
 * server-side on `assertClubAdminForPod`, so another club's pod is FORBIDDEN
 * whatever route reaches this screen. The pods list used to send its "Pod
 * Details" action to the PUBLIC pod page, which shows a club admin none of the
 * roster, money or trail they opened it for.
 *
 * Attendance is a LINK, not a second roster: the board is viewer-aware, so a
 * club admin opening it already sees their own override beside the host's
 * scanner, and there is exactly one screen that writes attendance.
 */
export function ClubPodDetailsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ClubPodDetails'>>();
  const { clubId, podId } = params;
  const detail = useClubPodDetail(podId);
  const pod = detail.pod;
  const missing = !detail.isLoading && !detail.hasError && !pod;

  const editAction = (
    <DuncitButton
      testID="club-pod-detail-edit"
      label={t('clubAdmin.pods.editPod')}
      size="sm"
      onPress={() => navigation.navigate('ClubPodEdit', { clubId, podId })}
    />
  );

  return (
    <StackScreen
      title={pod?.pod_title ?? t('clubAdmin.pods.podDetails')}
      testID="club-pod-details-screen"
      right={editAction}
    >
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          {detail.isLoading && !pod ? (
            <Spinner
              role="progressbar"
              aria-label={t('mweb.a11y.loading')}
              testID="club-pod-details-loading"
              color="$primary"
            />
          ) : null}
          {detail.hasError ? (
            <LoadErrorNotice testID="club-pod-details-error" onRetry={detail.refetch} />
          ) : null}
          {missing ? (
            <Text testID="club-pod-details-missing" fontSize={14} color="$muted" textAlign="center">
              {t('clubAdmin.editor.notFound')}
            </Text>
          ) : null}
          {pod ? (
            <>
              <PodDetailOverview pod={pod} />
              <PodDetailTimeline pod={pod} />
              <PodDetailHosts hosts={detail.hosts} />
              <PodDetailClub club={pod.club ?? null} />
              <PodDetailFeedback podId={pod.id} />
              <PodDetailAttendees
                rows={detail.attendees}
                podDateTime={pod.pod_date_time}
                isLoading={detail.isLoading}
              />
              <PodDetailPayments podId={pod.id} />
              {/* The one thing a club admin opens a pod to DO. It is a door to
                  the existing board rather than a roster of its own: one
                  screen writes attendance, and it already knows the caller is
                  a club admin rather than the host. */}
              <PodDetailSection
                title={t('clubAdmin.pods.podAttendance')}
                testID="club-pod-detail-attendance"
              >
                <NavRow
                  testID="club-pod-detail-attendance-link"
                  icon="how-to-reg"
                  label={t('clubAdmin.pods.podAttendance')}
                  onPress={() => navigation.navigate('PodAttendance', { podId: pod.id })}
                />
              </PodDetailSection>
            </>
          ) : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
