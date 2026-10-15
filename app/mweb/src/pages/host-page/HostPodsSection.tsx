import { useQuery } from '@apollo/client/react';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import EmptyState from '../../components/EmptyState';
import { RequestEventCard } from '../../components/event-request';
import PodsScheduleBlock, { type SchedulePod } from '../../components/public-page/PodsScheduleBlock';
import { USER_HOSTED_PODS } from '../../components/profile-tabs/queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  hostUserId: string;
  name: string;
}

/** The host's live pods — the venue page's Happening soon / Upcoming / Previous
 * rails; with nothing coming up, a signed-in member may request an event. */
export default function HostPodsSection({ hostUserId, name }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading } = useQuery<{ pods: SchedulePod[] }>(USER_HOSTED_PODS, {
    variables: { user_id: hostUserId },
    fetchPolicy: 'cache-and-network',
  });

  return (
    <PodsScheduleBlock
      testId="host-page-pods"
      title={t('publicPage.hostPage.podsTitle', { vars: { name } })}
      pods={data?.pods ?? []}
      loading={loading && !data}
      whenNothingUpcoming={<RequestEventCard targetType="HOST" targetId={hostUserId} targetName={name} />}
      empty={
        <EmptyState testId="host-page-no-pods" icon={<EventBusyOutlinedIcon />} title={t('publicPage.hostPage.noPods')} />
      }
    />
  );
}
