import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VerificationRow, { type VerificationItem } from './VerificationRow';

const USER_VERIFICATIONS = gql`
  query AdminUserVerifications($user_id: ID!) {
    userVerifications(user_id: $user_id) {
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

/** Admin review of a user's 3 verification types — Identity (document) and
 * Address (manual fields) are approve/reject; Email is verified by the app. */
export default function UserVerificationsSection({ userId }: Readonly<{ userId: string }>) {
  const { data, loading, refetch } = useQuery(USER_VERIFICATIONS, {
    variables: { user_id: userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const [review, { loading: saving }] = useMutation(REVIEW);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const act = async (type: string, status: 'APPROVED' | 'REJECTED') => {
    await review({
      variables: { user_id: userId, type, status, reject_reason: reasons[type] || null },
    });
    await refetch();
  };

  if (loading && !data) return <CircularProgress />;
  const verifications: VerificationItem[] = data?.userVerifications ?? [];

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <VerifiedUserIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1">Verification</Typography>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Details</TableCell>
              <TableCell align="right">Review</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {verifications.map((item) => (
              <VerificationRow
                key={item.type}
                item={item}
                saving={saving}
                reason={reasons[item.type] ?? ''}
                onReasonChange={(value) => setReasons((r) => ({ ...r, [item.type]: value }))}
                onAct={(status) => {
                  act(item.type, status).catch(() => undefined);
                }}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
