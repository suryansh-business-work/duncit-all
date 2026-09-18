import { useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Grid, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { BackHeader, QueryGuard, SectionCard } from '@duncit/ui';
import { ReturnStatusChip } from '../../../components/chips';
import { runAction } from '../../../lib/actions';
import { STORE_ADMIN_RETURN, UPDATE_RETURN, type StoreReturn } from '../queries';
import { ReturnHistoryPanel, ReturnRequestPanel, ReturnSummaryPanel } from './ReturnPanels';
import ReturnUpdateForm, { type toReturnUpdateInput } from './return-update';

/** The page once the return has loaded: the request and its history, then what to do next. */
function ReturnDetail({ item }: Readonly<{ item: StoreReturn }>) {
  const { t } = useTranslation();
  const [update, updateState] = useMutation(UPDATE_RETURN, { refetchQueries: ['StoreReturnsForOrder'] });
  const submit = (input: ReturnType<typeof toReturnUpdateInput>) =>
    runAction(() => update({ variables: { id: item.id, input } }), t('ecommPortal.returns.updated'));
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Stack spacing={3}>
          <ReturnRequestPanel item={item} />
          <ReturnHistoryPanel item={item} />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={3}>
          <SectionCard title={t('ecommPortal.returns.nextStep')}>
            {item.next_statuses.length > 0 ? (
              <ReturnUpdateForm key={item.status} item={item} busy={updateState.loading} onSubmit={submit} />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('ecommPortal.returns.closedNothingLeft')}
              </Typography>
            )}
          </SectionCard>
          <ReturnSummaryPanel item={item} />
        </Stack>
      </Grid>
    </Grid>
  );
}

/** One return request (`/returns/:id`). */
export default function ReturnDetailPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { id = '' } = useParams<{ id: string }>();
  const { data, loading, error } = useQuery(STORE_ADMIN_RETURN, { variables: { id }, fetchPolicy: 'cache-and-network' });
  const item = data?.storeAdminReturn;
  return (
    <Stack spacing={3}>
      <BackHeader
        title={item?.return_no ?? t('ecommPortal.returns.return')}
        eyebrow={item ? t('ecommPortal.returns.requestedOn', { vars: { date: formatDateTime(item.created_at) } }) : undefined}
        backTo="/returns"
        backAriaLabel={t('ecommPortal.common.backTo', { vars: { name: t('ecommPortal.nav.returns') } })}
        actions={item ? <ReturnStatusChip status={item.status} /> : undefined}
      />
      <QueryGuard loading={loading && !item} error={error} notFound={!loading && !item} notFoundText={t('ecommPortal.common.notFound')}>
        {() => item && <ReturnDetail item={item} />}
      </QueryGuard>
    </Stack>
  );
}
