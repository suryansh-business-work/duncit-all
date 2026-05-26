import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import HealthScoreCard from './HealthScoreCard';
import { USER_ACCOUNT_HEALTH, type AdminHealthScore } from './queries';

interface Props {
  userId: string;
}

export default function UserHealthSection({ userId }: Props) {
  const { data, loading, error } = useQuery<{ userAccountHealth: AdminHealthScore }>(
    USER_ACCOUNT_HEALTH,
    { variables: { user_id: userId }, fetchPolicy: 'cache-and-network', skip: !userId }
  );
  const [override, setOverride] = useState<AdminHealthScore | null>(null);
  const score = override ?? data?.userAccountHealth;

  return (
    <Stack spacing={2}>
      <Stack>
        <Typography variant="h6" fontWeight={900}>
          Account Health
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Default score is 100. Use the Adjust action to decrease or increase it with a remark
          — remarks are visible to the user when they tap their meter.
        </Typography>
      </Stack>

      {loading && !data && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {error && <Alert severity="error">{error.message}</Alert>}

      {score && <HealthScoreCard score={score} onUpdated={setOverride} />}
    </Stack>
  );
}
