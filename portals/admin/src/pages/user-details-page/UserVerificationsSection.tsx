import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const USER_VERIFICATIONS = gql`
  query AdminUserVerifications($user_id: ID!) {
    userVerifications(user_id: $user_id) {
      type
      status
      document_url
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

const LABELS: Record<string, string> = {
  IDENTITY: 'Identity',
  ADDRESS: 'Address',
  PHONE: 'Phone',
  EMAIL: 'Email',
  BANK_ACCOUNT: 'Bank Account',
  POLICE: 'Police',
  SELFIE: 'Selfie',
};

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  NOT_SUBMITTED: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

/** Admin review of a user's 7 verification types — approve or reject each with
 * an optional reason (B2-#9). */
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
  const verifications = data?.userVerifications ?? [];

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
              <TableCell>Document</TableCell>
              <TableCell align="right">Review</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {verifications.map((item: any) => (
              <TableRow key={item.type}>
                <TableCell>{LABELS[item.type] ?? item.type}</TableCell>
                <TableCell>
                  <Chip size="small" label={item.status} color={STATUS_COLOR[item.status]} />
                </TableCell>
                <TableCell>
                  {item.document_url ? (
                    <Link href={item.document_url} target="_blank" rel="noopener">
                      View
                    </Link>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                    <TextField
                      size="small"
                      placeholder="Reject reason"
                      value={reasons[item.type] ?? ''}
                      onChange={(e) => setReasons((r) => ({ ...r, [item.type]: e.target.value }))}
                      sx={{ width: 160 }}
                    />
                    <Button
                      size="small"
                      color="success"
                      variant="outlined"
                      disabled={saving}
                      onClick={() => {
                        act(item.type, 'APPROVED').catch(() => undefined);
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      disabled={saving}
                      onClick={() => {
                        act(item.type, 'REJECTED').catch(() => undefined);
                      }}
                    >
                      Reject
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
