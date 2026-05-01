import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';

const POD_IDEAS = gql`
  query AdminPodIdeas($filter: PodIdeaFilterInput) {
    podIdeas(filter: $filter) {
      id
      author_id
      title
      description
      likes_count
      shares_count
      comments_count
      status
      created_at
      author {
        user_id
        full_name
        first_name
        email
        profile_photo
      }
    }
  }
`;

const POD_IDEA_DETAILS = gql`
  query AdminPodIdeaDetails($id: ID!) {
    podIdea(pod_idea_doc_id: $id) {
      id
      author_id
      title
      description
      likes_count
      shares_count
      comments_count
      status
      created_at
      author {
        user_id
        full_name
        email
        profile_photo
      }
      comments {
        id
        author_id
        text
        created_at
        author {
          user_id
          full_name
          email
        }
      }
    }
  }
`;

const SET_STATUS = gql`
  mutation SetPodIdeaStatus($id: ID!, $status: PodIdeaStatus!) {
    setPodIdeaStatus(pod_idea_doc_id: $id, status: $status) {
      id
      status
    }
  }
`;
const DELETE_IDEA = gql`
  mutation AdminDeletePodIdea($id: ID!) {
    deletePodIdea(pod_idea_doc_id: $id)
  }
`;
const DELETE_COMMENT = gql`
  mutation AdminDeletePodIdeaComment($id: ID!, $commentId: ID!) {
    deletePodIdeaComment(pod_idea_doc_id: $id, comment_id: $commentId) {
      id
      comments_count
    }
  }
`;

const STATUS_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;
type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

const statusColor = (s: Status) =>
  s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'error' : 'warning';

const statusIcon = (s: Status) =>
  s === 'APPROVED' ? (
    <CheckCircleIcon fontSize="small" />
  ) : s === 'REJECTED' ? (
    <CancelIcon fontSize="small" />
  ) : (
    <HourglassEmptyIcon fontSize="small" />
  );

export default function PodIdeasPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [search, setSearch] = useState('');
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filter = useMemo(() => {
    const f: any = {};
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [statusFilter, search]);

  const { data, loading, refetch } = useQuery(POD_IDEAS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const ideas: any[] = data?.podIdeas ?? [];

  const [setStatusMut] = useMutation(SET_STATUS);
  const [deleteMut] = useMutation(DELETE_IDEA);

  const setStatus = async (id: string, status: Status) => {
    try {
      await setStatusMut({ variables: { id, status } });
      setToast(`Marked ${status.toLowerCase()}`);
      await refetch();
    } catch (e: any) {
      setToast(e.message);
    }
  };

  const doDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteMut({ variables: { id: delTarget.id } });
      setToast('Deleted');
      setDelTarget(null);
      await refetch();
    } catch (e: any) {
      setToast(e.message);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <LightbulbIcon color="warning" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Pod Ideas
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          sx={{ minWidth: 160 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: 420 }}
          placeholder="Title or description"
        />
      </Stack>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading && !data ? (
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
                          <IconButton size="small" onClick={() => setDetailsId(it.id)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {it.status !== 'APPROVED' && (
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => setStatus(it.id, 'APPROVED')}
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
                              onClick={() => setStatus(it.id, 'REJECTED')}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDelTarget(it)}
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

      {detailsId && (
        <DetailsDialog
          id={detailsId}
          onClose={() => setDetailsId(null)}
          onChanged={refetch}
        />
      )}

      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)}>
        <DialogTitle>Delete idea?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete <b>{delTarget?.title}</b> along with all its comments.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Box>
  );
}

interface DetailsProps {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}

function DetailsDialog({ id, onClose, onChanged }: DetailsProps) {
  const { data, loading, refetch } = useQuery(POD_IDEA_DETAILS, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const idea = data?.podIdea;
  const [setStatusMut] = useMutation(SET_STATUS);
  const [deleteCommentMut] = useMutation(DELETE_COMMENT);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {idea?.title ?? 'Pod idea'}
        {idea && (
          <Chip
            size="small"
            sx={{ ml: 1.5 }}
            label={idea.status}
            color={statusColor(idea.status) as any}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading && !data ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !idea ? (
          <Alert severity="warning">Idea not found.</Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Avatar
                src={idea.author?.profile_photo || undefined}
                sx={{ width: 40, height: 40 }}
              >
                {(idea.author?.full_name?.[0] ?? 'U').toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {idea.author?.full_name ?? 'Member'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {idea.author?.email ?? ''} · {new Date(idea.created_at).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {idea.description}
            </Typography>
            <Stack direction="row" spacing={3} sx={{ mb: 2, color: 'text.secondary' }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <FavoriteIcon fontSize="small" />
                <Typography variant="body2">{idea.likes_count} likes</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ChatBubbleOutlineIcon fontSize="small" />
                <Typography variant="body2">{idea.comments_count} comments</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ShareIcon fontSize="small" />
                <Typography variant="body2">{idea.shares_count} shares</Typography>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="overline" color="text.secondary">
              Comments
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {idea.comments.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No comments yet.
                </Typography>
              )}
              {idea.comments.map((c: any) => (
                <Stack key={c.id} direction="row" spacing={1.5} alignItems="flex-start">
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {(c.author?.full_name?.[0] ?? 'U').toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      <Typography variant="body2" fontWeight={600}>
                        {c.author?.full_name ?? 'Member'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(c.created_at).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {c.text}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (!window.confirm('Delete this comment?')) return;
                      await deleteCommentMut({ variables: { id, commentId: c.id } });
                      await refetch();
                      onChanged();
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>
      {idea && (
        <DialogActions>
          {idea.status !== 'PENDING' && (
            <Button
              onClick={async () => {
                await setStatusMut({ variables: { id, status: 'PENDING' } });
                await refetch();
                onChanged();
              }}
            >
              Reset to Pending
            </Button>
          )}
          {idea.status !== 'REJECTED' && (
            <Button
              color="warning"
              onClick={async () => {
                await setStatusMut({ variables: { id, status: 'REJECTED' } });
                await refetch();
                onChanged();
              }}
            >
              Reject
            </Button>
          )}
          {idea.status !== 'APPROVED' && (
            <Button
              variant="contained"
              color="success"
              onClick={async () => {
                await setStatusMut({ variables: { id, status: 'APPROVED' } });
                await refetch();
                onChanged();
              }}
            >
              Approve
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
