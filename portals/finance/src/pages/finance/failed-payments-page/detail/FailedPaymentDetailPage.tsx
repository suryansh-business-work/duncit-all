import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useDateFormat, useTranslation, type DateFormatter } from '@duncit/app-settings';
import DetailHeader from './DetailHeader';
import OverviewCards from './OverviewCards';
import AiSummaryCard from './AiSummaryCard';
import EvidenceCard from './EvidenceCard';
import VerificationCard from './VerificationCard';
import OutcomeCards from './OutcomeCards';
import EventTimeline from './EventTimeline';
import { useReverify } from './useReverify';
import FailedPaymentDialogs from '../FailedPaymentDialogs';
import { useCanManageFailedPayments } from '../rowStyle';
import { useFailedPaymentActions } from '../useFailedPaymentActions';
import { FAILED_PAYMENT, type FailedPaymentData, type FailedPaymentDetail } from '../queries';

/**
 * Every mutation answers with the whole case under the same id, so Apollo's
 * normalised cache repaints this page from the reply on its own — nothing more
 * to write, and no refetch to race the write it should show.
 */
const repaintFromCache = () => undefined;

interface BodyProps {
  detail: FailedPaymentDetail;
  formatDateTime: DateFormatter['formatDateTime'];
}

function FailedPaymentBody({ detail, formatDateTime }: Readonly<BodyProps>) {
  const canManage = useCanManageFailedPayments();
  const actions = useFailedPaymentActions(repaintFromCache);
  const { reverify, busy } = useReverify(detail.id, repaintFromCache);

  return (
    <>
      <DetailHeader
        detail={detail}
        canManage={canManage}
        reverifyBusy={busy}
        onReverify={reverify}
        onAction={(kind) => actions.open(kind, { ...detail, user_name: detail.user.name })}
      />
      <Stack spacing={2}>
        <AiSummaryCard detail={detail} formatDateTime={formatDateTime} />
        <OverviewCards detail={detail} formatDateTime={formatDateTime} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
          <EvidenceCard detail={detail} formatDateTime={formatDateTime} />
          <VerificationCard detail={detail} formatDateTime={formatDateTime} />
        </Stack>
        <OutcomeCards detail={detail} formatDateTime={formatDateTime} />
        {/* Remounted on every change to the case, so new timeline entries appear. */}
        <EventTimeline key={detail.revision} caseId={detail.id} formatDateTime={formatDateTime} />
      </Stack>
      <FailedPaymentDialogs actions={actions} />
    </>
  );
}

/** Finance › Failed Payments › one case: what failed, what the buyer sent, what was checked and decided. */
export default function FailedPaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data, loading, error } = useQuery<FailedPaymentData>(FAILED_PAYMENT, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const detail = data?.failedPayment;

  return (
    <QueryGuard
      loading={loading && !detail}
      error={error}
      notFound={!detail}
      notFoundText={t('finance.failedPayments.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => <FailedPaymentBody detail={detail as FailedPaymentDetail} formatDateTime={formatDateTime} />}
    </QueryGuard>
  );
}
