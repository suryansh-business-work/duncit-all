import { useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DELETE_USER_CONTACT_ACTION, USER_CONTACT_ACTIONS } from './queries';

interface Props {
  userId: string;
  refreshToken: number;
}

export default function ContactActionsSection({ userId, refreshToken }: Props) {
  const { data, loading, error, refetch } = useQuery(USER_CONTACT_ACTIONS, {
    variables: { user_id: userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const [deleteAction] = useMutation(DELETE_USER_CONTACT_ACTION);

  const remove = async (id: string) => {
    await deleteAction({ variables: { action_id: id } });
    await refetch();
  };

  useEffect(() => {
    if (refreshToken) refetch();
  }, [refreshToken, refetch]);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1">Call &amp; Email Logs</Typography>
          {loading && !data ? <CircularProgress size={22} /> : null}
          {error && <Alert severity="error">{error.message}</Alert>}
          {(data?.userContactActions ?? []).length === 0 && !loading ? (
            <Typography variant="body2" color="text.secondary">No contact logs yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {(data?.userContactActions ?? []).map((action: any) => (
                <Stack
                  key={action.id}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}
                >
                  <Chip size="small" label={action.type} color={action.type === 'CALL' ? 'primary' : 'secondary'} />
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>{action.target}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {action.status} · {new Date(action.created_at).toLocaleString()}
                      {action.duration_seconds ? ` · ${action.duration_seconds}s` : ''}
                    </Typography>
                    {action.subject && <Typography variant="caption">{action.subject}</Typography>}
                    {action.notes && <Typography variant="caption" color="text.secondary">{action.notes}</Typography>}
                    {action.recording_url && (
                      <Typography variant="caption" component="a" href={action.recording_url} target="_blank" rel="noreferrer">
                        Recording
                      </Typography>
                    )}
                  </Stack>
                  <IconButton size="small" color="error" onClick={() => remove(action.id)} aria-label="delete contact log">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}