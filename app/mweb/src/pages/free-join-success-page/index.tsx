import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import CheckoutSuccess from '../checkout-page/CheckoutSuccess';
import { CheckoutSkeleton, EmptyCheckout } from '../checkout-page/CheckoutPage/CheckoutFallbacks';
import { parseApiError } from '../../utils/parseApiError';
import { useTranslation } from '../../i18n/useTranslation';
import { FREE_JOIN_SUCCESS, type FreeJoinSuccessData } from './queries';

/**
 * Where a FREE pod's instant join lands: /pod/:podId/booked.
 *
 * The same confirmation a paid booking ends on — the pod, the calendar
 * shortcuts and the ticket download — with no receipt or invoice, because
 * nothing was paid. Before this, a free join stayed on Pod Details and the
 * member had to find their ticket in Pod History.
 */
export default function FreeJoinSuccessPage() {
  const { podId = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<FreeJoinSuccessData>(FREE_JOIN_SUCCESS, {
    variables: { id: podId },
    skip: !podId,
    fetchPolicy: 'network-only',
  });

  if (loading && !data) return <CheckoutSkeleton />;
  if (error) {
    return (
      <Alert severity="error" data-testid="free-join-success-error">
        {parseApiError(error)}
      </Alert>
    );
  }
  // Opened by hand, or the spot was cancelled since: nothing to confirm.
  if (!data?.pod || !data.podMembershipState?.is_member) {
    return (
      <EmptyCheckout
        onHome={() => navigate('/')}
        title={t('mweb.podHistory.notFound')}
        action={t('mweb.checkout.backToHome')}
      />
    );
  }
  return (
    <CheckoutSuccess
      payment={null}
      pod={data.pod}
      onHome={() => navigate('/')}
      onProfile={() => navigate('/pod-history')}
      profileLabel={t('mweb.checkout.myBookings')}
    />
  );
}
