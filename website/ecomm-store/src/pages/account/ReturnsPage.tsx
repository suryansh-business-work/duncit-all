import { useQuery } from '@apollo/client/react';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import { Loader } from '@duncit/ui';

import { EmptyState } from '../../components/EmptyState';
import { MY_RETURNS } from '../../graphql/returns';
import { useStoreT } from '../../i18n';
import { ReturnsList } from '../order-detail/ReturnsList';
import { AccountLayout } from './AccountLayout';

/** /account/returns — every return the buyer has asked for. */
export function ReturnsPage() {
  const { t } = useStoreT();
  const { data, loading } = useQuery(MY_RETURNS, { fetchPolicy: 'cache-and-network' });
  const returns = data?.storeMyReturns ?? [];
  let body = <ReturnsList returns={returns} />;
  if (loading && returns.length === 0) body = <Loader label={t('ecommStore.common.loading')} />;
  else if (returns.length === 0) body = <EmptyState icon={<AssignmentReturnOutlinedIcon />} title={t('ecommStore.account.noReturns')} />;
  return <AccountLayout title={t('ecommStore.account.returns')}>{body}</AccountLayout>;
}
