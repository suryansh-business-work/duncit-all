import { useCallback, useMemo, useRef } from 'react';
import { gql, useApolloClient, useMutation } from '@apollo/client';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import {
  DuncitTable,
  useApolloTableFetch,
  type DuncitColumn,
  type TableFetch,
  type TableQueryState,
} from '@duncit/table';
import { notifyError } from '@duncit/dialogs';
import {
  ReviewCell,
  TYPE_LABELS,
  detailValue,
  renderDetailCell,
  renderStatusCell,
  statusLabel,
  type ReviewStatus,
  type VerificationItem,
  type VerificationType,
} from './VerificationCells';
import { useTranslation } from '@duncit/shell';

const USER_VERIFICATIONS_TABLE = gql`
  query AdminUserVerificationsTable($user_id: ID!, $query: TableQueryInput) {
    userVerificationsTable(user_id: $user_id, query: $query) {
      total
      rows {
        type
        status
        document_url
        address {
          line1
          line2
          city
          state
          pincode
          country
        }
        reject_reason
      }
    }
  }
`;

const REVIEW = gql`
  mutation AdminReviewVerification(
    $user_id: ID!
    $type: VerificationType!
    $status: VerificationStatus!
    $reject_reason: String
  ) {
    reviewVerification(
      user_id: $user_id
      type: $type
      status: $status
      reject_reason: $reject_reason
    ) {
      type
      status
    }
  }
`;

type Translate = ReturnType<typeof useTranslation>['t'];

const typeOptions = (t: Translate) => [
  { value: 'IDENTITY', label: t('admin.verification.identity') },
  { value: 'ADDRESS', label: t('admin.profile.address') },
  { value: 'EMAIL', label: t('shell.common.email') },
];

const statusOptions = (t: Translate) => [
  { value: 'NOT_SUBMITTED', label: t('admin.verification.notVerified') },
  { value: 'PENDING', label: t('admin.verification.underReview') },
  { value: 'APPROVED', label: t('admin.verification.approved') },
  { value: 'REJECTED', label: t('admin.verification.rejected') },
  { value: 'VERIFIED_BY_APP', label: t('admin.verification.verifiedByApp') },
];

// One row per verification type, so the type doubles as the row id.
const getVerificationRowId = (v: VerificationItem) => v.type;

/** Admin review of a user's 3 verification types — Identity (document) and
 * Address (manual fields) are approve/reject; Email is verified by the app. */
export default function UserVerificationsSection({ userId }: Readonly<{ userId: string }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [review, { loading: saving }] = useMutation(REVIEW);

  const fetchTable = useApolloTableFetch<VerificationItem>(
    client,
    USER_VERIFICATIONS_TABLE,
    'userVerificationsTable',
    { extraVariables: { user_id: userId } },
    [userId],
  );
  const fetchRows: TableFetch<VerificationItem> = useCallback(
    async (q: TableQueryState) => (userId ? fetchTable(q) : { rows: [], total: 0 }),
    [userId, fetchTable],
  );

  const onAct = useCallback(
    async (type: VerificationType, status: ReviewStatus, reason: string) => {
      try {
        await review({
          variables: { user_id: userId, type, status, reject_reason: reason || null },
        });
        refetchRef.current?.();
      } catch (e: any) {
        notifyError(e.message ?? 'Could not save review');
      }
    },
    [review, userId],
  );

  const columns = useMemo<DuncitColumn<VerificationItem>[]>(() => {
    const renderReview = (item: VerificationItem) => (
      <ReviewCell item={item} saving={saving} onAct={onAct} />
    );
    return [
      {
        field: 'type',
        headerName: t('admin.roles.type'),
        filter: { type: 'select', options: typeOptions(t) },
        minWidth: 120,
        valueGetter: (v) => TYPE_LABELS[v.type],
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        filter: { type: 'select', options: statusOptions(t) },
        minWidth: 160,
        cellRenderer: renderStatusCell,
        valueGetter: (v) => statusLabel(v.status),
      },
      {
        field: 'details',
        headerName: t('admin.verification.details'),
        sortable: false,
        flex: 1,
        minWidth: 200,
        cellRenderer: renderDetailCell,
        valueGetter: detailValue,
      },
      { field: 'review', headerName: t('admin.verification.review'), sortable: false, minWidth: 380, cellRenderer: renderReview },
    ];
  }, [saving, onAct]);

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1.5
          }}>
          <VerifiedUserIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1">{t('admin.tabs.verification')}</Typography>
        </Stack>
        <DuncitTable<VerificationItem>
          tableId="admin-user-verifications"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getVerificationRowId}
          emptyText={t('admin.verification.empty')}
          searchPlaceholder="Search type or status"
          refetchRef={refetchRef}
        />
      </CardContent>
    </Card>
  );
}
