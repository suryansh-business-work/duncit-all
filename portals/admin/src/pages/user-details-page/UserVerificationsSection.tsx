import { useCallback, useMemo, useRef } from 'react';
import { gql, useApolloClient, useMutation } from '@apollo/client';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import {
  DuncitTable,
  tableQueryToGql,
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

const TYPE_OPTIONS = [
  { value: 'IDENTITY', label: 'Identity' },
  { value: 'ADDRESS', label: 'Address' },
  { value: 'EMAIL', label: 'Email' },
];

const STATUS_OPTIONS = [
  { value: 'NOT_SUBMITTED', label: 'Not Verified' },
  { value: 'PENDING', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'VERIFIED_BY_APP', label: 'Verified by the App' },
];

// One row per verification type, so the type doubles as the row id.
const getVerificationRowId = (v: VerificationItem) => v.type;

/** Admin review of a user's 3 verification types — Identity (document) and
 * Address (manual fields) are approve/reject; Email is verified by the app. */
export default function UserVerificationsSection({ userId }: Readonly<{ userId: string }>) {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [review, { loading: saving }] = useMutation(REVIEW);

  const fetchRows: TableFetch<VerificationItem> = useCallback(
    async (q: TableQueryState) => {
      if (!userId) return { rows: [], total: 0 };
      const { data } = await client.query({
        query: USER_VERIFICATIONS_TABLE,
        variables: { user_id: userId, ...tableQueryToGql(q) },
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.userVerificationsTable.rows as VerificationItem[],
        total: data.userVerificationsTable.total as number,
      };
    },
    [client, userId],
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
        headerName: 'Type',
        filter: { type: 'select', options: TYPE_OPTIONS },
        minWidth: 120,
        valueGetter: (v) => TYPE_LABELS[v.type],
      },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_OPTIONS },
        minWidth: 160,
        cellRenderer: renderStatusCell,
        valueGetter: (v) => statusLabel(v.status),
      },
      {
        field: 'details',
        headerName: 'Details',
        sortable: false,
        flex: 1,
        minWidth: 200,
        cellRenderer: renderDetailCell,
        valueGetter: detailValue,
      },
      { field: 'review', headerName: 'Review', sortable: false, minWidth: 380, cellRenderer: renderReview },
    ];
  }, [saving, onAct]);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <VerifiedUserIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1">Verification</Typography>
        </Stack>
        <DuncitTable<VerificationItem>
          tableId="admin-user-verifications"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getVerificationRowId}
          emptyText="No verifications yet."
          searchPlaceholder="Search type or status"
          refetchRef={refetchRef}
        />
      </CardContent>
    </Card>
  );
}
