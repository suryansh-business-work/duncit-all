import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import ProductPage from '../ProductPage';
import { PAGE_COPY } from '../page-copy';
import { PRODUCT_USER } from '../queries';
import UserSearch from './UserSearch';
import UserProfileCard from './UserProfileCard';
import UserTimeline from './UserTimeline';

/**
 * Analytics > Product > Users — one member's profile and timeline. The member
 * is in the URL (`?user=`), so a session or an event links straight here.
 */
export default function UsersPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const userId = params.get('user');
  const { data, loading, error } = useQuery(PRODUCT_USER, { variables: { user_id: userId ?? '' }, skip: !userId });
  const profile = data?.productUser;
  return (
    <ProductPage
      copy={PAGE_COPY.users}
      testId="product-users"
    >
      <UserSearch onPick={(id) => setParams({ user: id })} />
      {!userId && <Alert severity="info">{t('analytics.product.users.pick')}</Alert>}
      {userId && loading && !profile && <Loader variant="page" />}
      {userId && error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {userId && profile && (
        <Stack spacing={2}>
          <UserProfileCard profile={profile} />
          <UserTimeline key={userId} userId={userId} />
        </Stack>
      )}
    </ProductPage>
  );
}
