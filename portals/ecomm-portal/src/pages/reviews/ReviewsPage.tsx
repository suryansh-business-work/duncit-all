import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Rating, Stack, Typography } from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import { useTranslation } from '@duncit/shell';
import { actionsColumn, dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import StoreTable from '../../components/StoreTable';
import { useRowDelete, useTableRefresh } from '../../components/useTableActions';
import { DELETE_REVIEW, REPLY_REVIEW, STORE_REVIEWS_TABLE, type StoreReviewRow } from './queries';
import ReviewReplyForm from './review-reply';

const renderRating = (row: StoreReviewRow) => <Rating value={row.rating} readOnly size="small" />;

const renderComment = (row: StoreReviewRow) => (
  <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.4, py: 0.5 }}>
    {row.comment || EM_DASH}
  </Typography>
);

/** Every review on a listed product — reply in the store's name, or remove one. */
export default function ReviewsPage() {
  const { t } = useTranslation();
  const { refetchRef, run } = useTableRefresh();
  const removeRow = useRowDelete(DELETE_REVIEW, run);
  const [replying, setReplying] = useState<StoreReviewRow | null>(null);
  const [reply, replyState] = useMutation(REPLY_REVIEW);

  const sendReply = async (text: string) => {
    if (!replying) return;
    const sent = await run(() => reply({ variables: { id: replying.id, reply: text } }), t('ecommPortal.reviews.replied'));
    if (sent) setReplying(null);
  };

  const columns = useMemo<DuncitColumn<StoreReviewRow>[]>(
    () => [
      { field: 'product_name', headerName: t('ecommPortal.common.product'), type: 'text', minWidth: 180, flex: 1, sortable: false, filterable: false },
      { field: 'user_name', headerName: t('ecommPortal.reviews.reviewer'), type: 'text', width: 160, filterable: false },
      { field: 'rating', headerName: t('ecommPortal.reviews.rating'), type: 'number', width: 150, cellRenderer: renderRating },
      { field: 'comment', headerName: t('ecommPortal.reviews.comment'), type: 'text', flex: 2, minWidth: 240, sortable: false, filterable: false, cellRenderer: renderComment },
      {
        field: 'seller_reply',
        headerName: t('ecommPortal.reviews.reply'),
        type: 'text',
        minWidth: 200,
        flex: 1,
        sortable: false,
        filterable: false,
        valueGetter: (row) => row.seller_reply || EM_DASH,
      },
      dateColumn<StoreReviewRow>({ headerName: t('shell.common.created'), hide: false, width: 140 }),
      actionsColumn<StoreReviewRow>({
        onEdit: setReplying,
        edit: {
          icon: <ReplyIcon fontSize="small" />,
          title: t('ecommPortal.reviews.reply'),
          ariaLabel: (row) => t('ecommPortal.reviews.replyTo', { vars: { name: row.user_name } }),
        },
        onDelete: (row) => removeRow(row.id, t('ecommPortal.reviews.reviewBy', { vars: { name: row.user_name } })),
        delete: { ariaLabel: (row) => t('shell.a11y.deleteNamed', { vars: { name: row.user_name } }) },
      }),
    ],
    [t, removeRow],
  );

  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.reviews')} subtitle={t('ecommPortal.reviews.subtitle')} />
      <StoreTable<StoreReviewRow>
        tableId="ecomm-reviews"
        query={STORE_REVIEWS_TABLE}
        resultKey="storeReviewsTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.reviews')}
        emptyText={t('ecommPortal.reviews.empty')}
        searchPlaceholder={t('ecommPortal.reviews.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        refetchRef={refetchRef}
      />
      {replying && (
        <ReviewReplyForm review={replying} busy={replyState.loading} onClose={() => setReplying(null)} onSubmit={sendReply} />
      )}
    </Stack>
  );
}
