import {
  Alert,
  Avatar,
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import { type Status, statusColor, statusIcon } from './queries';

interface Props {
  loading: boolean;
  hasData: boolean;
  ideas: any[];
  onView: (id: string) => void;
  onSetStatus: (id: string, status: Status) => void;
  onDelete: (idea: any) => void;
}

export default function IdeasTable({
  loading,
  hasData,
  ideas,
  onView,
  onSetStatus,
  onDelete,
}: Readonly<Props>) {
  return (
    <Card>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {loading && !hasData ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : ideas.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            No pod ideas match the current filters.
          </Alert>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Idea</TableCell>
                  <TableCell>Author</TableCell>
                  <TableCell align="center">Engagement</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ideas.map((it: any) => (
                  <TableRow key={it.id} hover>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {it.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {it.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {new Date(it.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          src={it.author?.profile_photo || undefined}
                          sx={{ width: 28, height: 28 }}
                        >
                          {(it.author?.first_name?.[0] ?? 'U').toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {it.author?.full_name ?? '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {it.author?.email ?? ''}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                        sx={{ color: 'text.secondary', fontSize: 12 }}
                      >
                        <Tooltip title="Likes">
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <FavoriteIcon fontSize="inherit" />
                            <span>{it.likes_count}</span>
                          </Stack>
                        </Tooltip>
                        <Tooltip title="Comments">
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <ChatBubbleOutlineIcon fontSize="inherit" />
                            <span>{it.comments_count}</span>
                          </Stack>
                        </Tooltip>
                        <Tooltip title="Shares">
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <ShareIcon fontSize="inherit" />
                            <span>{it.shares_count}</span>
                          </Stack>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={statusIcon(it.status)}
                        label={it.status}
                        color={statusColor(it.status) as any}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => onView(it.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {it.status !== 'APPROVED' && (
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onSetStatus(it.id, 'APPROVED')}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {it.status !== 'REJECTED' && (
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => onSetStatus(it.id, 'REJECTED')}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(it)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
