import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import {
  POD_IDEAS,
  SET_STATUS,
  DELETE_IDEA,
  STATUS_OPTIONS,
  Status,
  statusColor,
  statusIcon,
} from './queries';
import DetailsDialog from './DetailsDialog';

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
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
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
            This will permanently delete <b>{delTarget?.title}</b> along with all its
            comments.
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
