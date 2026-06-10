import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { SCOPES } from './helpers';

interface Props {
  loading: boolean;
  hasData: boolean;
  notifications: any[];
  locName: (id?: string | null) => string;
  onDelete: (n: any) => void;
}

function ScopeChip({
  notification,
  locName,
}: Readonly<{
  notification: any;
  locName: (id?: string | null) => string;
}>) {
  const meta = SCOPES.find((s) => s.value === notification.scope);
  let label = meta?.label ?? notification.scope;
  if (notification.scope === 'LOCATION') label = `Location · ${locName(notification.location_id)}`;
  if (notification.scope === 'ZONE')
    label = `Zone · ${locName(notification.location_id)} / ${notification.zone_name}`;
  if (notification.scope === 'USER')
    label = `Users · ${notification.target_user_ids?.length ?? 0}`;
  return (
    <Chip
      size="small"
      icon={meta?.icon}
      label={label}
      color={notification.scope === 'GLOBAL' ? 'primary' : 'default'}
      variant="outlined"
    />
  );
}

export default function NotificationsTable({
  loading,
  hasData,
  notifications,
  locName,
  onDelete,
}: Readonly<Props>) {
  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        {loading && !hasData ? (
          <Stack alignItems="center" sx={{ p: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Body</TableCell>
                <TableCell>Audience</TableCell>
                <TableCell>Delivered</TableCell>
                <TableCell>Failed</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map((n: any) => (
                <TableRow key={n.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {n.title}
                    </Typography>
                    {n.link_url && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ wordBreak: 'break-all' }}
                      >
                        → {n.link_url}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{ maxWidth: 280, display: 'inline-block' }}
                    >
                      {n.body}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <ScopeChip notification={n} locName={locName} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color="success" label={n.delivered_count} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={n.failed_count ? 'warning' : 'default'}
                      label={n.failed_count}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(n.created_at).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onDelete(n)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {notifications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No notifications yet
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
