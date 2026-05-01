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
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';

const POD_IDEAS = gql`
  query PodIdeas($filter: PodIdeaFilterInput) {
    podIdeas(filter: $filter) {
      id
      author_id
      title
      description
      likes_count
      liked_by_me
      shares_count
      comments_count
      status
      created_at
      author {
        user_id
        full_name
        first_name
        profile_photo
      }
    }
    me {
      user_id
      full_name
      first_name
      profile_photo
    }
  }
`;

const POD_IDEA_DETAILS = gql`
  query PodIdeaDetails($id: ID!) {
    podIdea(pod_idea_doc_id: $id) {
      id
      author_id
      title
      description
      likes_count
      liked_by_me
      shares_count
      comments_count
      status
      created_at
      author {
        user_id
        full_name
        first_name
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
          first_name
          profile_photo
        }
      }
    }
  }
`;

const CREATE_IDEA = gql`
  mutation CreatePodIdea($input: CreatePodIdeaInput!) {
    createPodIdea(input: $input) {
      id
    }
  }
`;
const TOGGLE_LIKE = gql`
  mutation TogglePodIdeaLike($id: ID!) {
    togglePodIdeaLike(pod_idea_doc_id: $id) {
      id
      likes_count
      liked_by_me
    }
  }
`;
const SHARE = gql`
  mutation SharePodIdea($id: ID!) {
    sharePodIdea(pod_idea_doc_id: $id) {
      id
      shares_count
    }
  }
`;
const ADD_COMMENT = gql`
  mutation AddPodIdeaComment($id: ID!, $text: String!) {
    addPodIdeaComment(pod_idea_doc_id: $id, text: $text) {
      id
      comments_count
    }
  }
`;
const DELETE_COMMENT = gql`
  mutation DeletePodIdeaComment($id: ID!, $commentId: ID!) {
    deletePodIdeaComment(pod_idea_doc_id: $id, comment_id: $commentId) {
      id
      comments_count
    }
  }
`;
const DELETE_IDEA = gql`
  mutation DeletePodIdea($id: ID!) {
    deletePodIdea(pod_idea_doc_id: $id)
  }
`;

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function PodIdeasPage() {
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [composerErr, setComposerErr] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filter = useMemo(() => {
    const f: any = { status: 'APPROVED' };
    if (search.trim()) f.search = search.trim();
    return f;
  }, [search]);

  const { data, loading, refetch } = useQuery(POD_IDEAS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const ideas: any[] = data?.podIdeas ?? [];
  const me = data?.me;
  const myId = me?.user_id;

  // Also show the user's own pending ideas at the top
  const { data: myData, refetch: refetchMine } = useQuery(POD_IDEAS, {
    variables: { filter: { author_id: myId } },
    skip: !myId,
    fetchPolicy: 'cache-and-network',
  });
  const myIdeas: any[] = (myData?.podIdeas ?? []).filter(
    (i: any) => i.status !== 'APPROVED'
  );

  const [createMut, { loading: creating }] = useMutation(CREATE_IDEA);
  const [toggleLikeMut] = useMutation(TOGGLE_LIKE);
  const [shareMut] = useMutation(SHARE);
  const [deleteMut] = useMutation(DELETE_IDEA);

  const refetchAll = async () => {
    await Promise.all([refetch(), myId ? refetchMine() : Promise.resolve()]);
  };

  const submit = async () => {
    setComposerErr(null);
    if (!title.trim() || !description.trim()) {
      setComposerErr('Title and description are both required');
      return;
    }
    try {
      await createMut({
        variables: { input: { title: title.trim(), description: description.trim() } },
      });
      setComposerOpen(false);
      setTitle('');
      setDescription('');
      setToast('Idea submitted! It will appear publicly once approved.');
      await refetchAll();
    } catch (e: any) {
      setComposerErr(e.message);
    }
  };

  const toggleLike = async (id: string) => {
    try {
      await toggleLikeMut({ variables: { id } });
    } catch (e: any) {
      setToast(e.message);
    }
  };

  const share = async (idea: any) => {
    const url = `${window.location.origin}/pod-ideas?id=${idea.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: idea.title, text: idea.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast('Link copied to clipboard');
      }
      await shareMut({ variables: { id: idea.id } });
      await refetch();
    } catch {
      // user cancelled — still bump the share count? no.
    }
  };

  const removeIdea = async (id: string) => {
    if (!window.confirm('Delete this idea?')) return;
    try {
      await deleteMut({ variables: { id } });
      setToast('Deleted');
      await refetchAll();
    } catch (e: any) {
      setToast(e.message);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: { xs: 1, sm: 2 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <LightbulbIcon color="warning" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Pod Ideas
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Suggest a pod, vote on community ideas, and join the conversation.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            if (!me) {
              setToast('Please sign in to share an idea');
              return;
            }
            setComposerOpen(true);
          }}
        >
          Share idea
        </Button>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="Search ideas…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {myIdeas.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
            Your submissions
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {myIdeas.map((idea: any) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                myId={myId}
                onOpen={() => setDetailsId(idea.id)}
                onLike={() => toggleLike(idea.id)}
                onShare={() => share(idea)}
                onDelete={() => removeIdea(idea.id)}
                showStatus
              />
            ))}
          </Stack>
        </Box>
      )}

      {loading && !data ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : ideas.length === 0 ? (
        <Alert severity="info">
          No ideas yet — be the first to share one!
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {ideas.map((idea: any) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              myId={myId}
              onOpen={() => setDetailsId(idea.id)}
              onLike={() => toggleLike(idea.id)}
              onShare={() => share(idea)}
              onDelete={() => removeIdea(idea.id)}
            />
          ))}
        </Stack>
      )}

      {/* Composer */}
      <Dialog
        open={composerOpen}
        onClose={() => !creating && setComposerOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Share a pod idea</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {composerErr && <Alert severity="error">{composerErr}</Alert>}
            <TextField
              autoFocus
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 160))}
              required
              fullWidth
              helperText={`${title.length} / 160`}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 4000))}
              required
              fullWidth
              multiline
              minRows={4}
              maxRows={10}
              helperText={`${description.length} / 4000 — describe the vibe, format, location, audience…`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposerOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submit} disabled={creating}>
            {creating ? <CircularProgress size={20} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details / comments */}
      {detailsId && (
        <IdeaDetailsDialog
          id={detailsId}
          myId={myId}
          onClose={() => setDetailsId(null)}
          onChanged={refetchAll}
        />
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Box>
  );
}

interface IdeaCardProps {
  idea: any;
  myId?: string;
  onOpen: () => void;
  onLike: () => void;
  onShare: () => void;
  onDelete: () => void;
  showStatus?: boolean;
}

function IdeaCard({
  idea,
  myId,
  onOpen,
  onLike,
  onShare,
  onDelete,
  showStatus,
}: IdeaCardProps) {
  const author = idea.author;
  const isMine = myId && idea.author_id === myId;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Avatar src={author?.profile_photo || undefined} sx={{ width: 36, height: 36 }}>
            {(author?.first_name?.[0] ?? author?.full_name?.[0] ?? 'U').toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {author?.full_name ?? 'Member'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatRelative(idea.created_at)}
            </Typography>
          </Box>
          {showStatus && (
            <Chip
              size="small"
              label={idea.status}
              color={
                idea.status === 'APPROVED'
                  ? 'success'
                  : idea.status === 'REJECTED'
                    ? 'error'
                    : 'warning'
              }
            />
          )}
          {isMine && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={onDelete}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <Box sx={{ cursor: 'pointer' }} onClick={onOpen}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            {idea.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              whiteSpace: 'pre-wrap',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {idea.description}
          </Typography>
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            size="small"
            startIcon={
              idea.liked_by_me ? (
                <FavoriteIcon fontSize="small" sx={{ color: 'error.main' }} />
              ) : (
                <FavoriteBorderIcon fontSize="small" />
              )
            }
            onClick={onLike}
            sx={{ color: idea.liked_by_me ? 'error.main' : 'text.secondary' }}
          >
            {idea.likes_count}
          </Button>
          <Button
            size="small"
            startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
            onClick={onOpen}
            sx={{ color: 'text.secondary' }}
          >
            {idea.comments_count}
          </Button>
          <Button
            size="small"
            startIcon={<ShareIcon fontSize="small" />}
            onClick={onShare}
            sx={{ color: 'text.secondary' }}
          >
            {idea.shares_count}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

interface DetailsProps {
  id: string;
  myId?: string;
  onClose: () => void;
  onChanged: () => void;
}

function IdeaDetailsDialog({ id, myId, onClose, onChanged }: DetailsProps) {
  const { data, loading, refetch } = useQuery(POD_IDEA_DETAILS, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const idea = data?.podIdea;
  const [text, setText] = useState('');
  const [addCommentMut, { loading: posting }] = useMutation(ADD_COMMENT);
  const [deleteCommentMut] = useMutation(DELETE_COMMENT);
  const [toggleLikeMut] = useMutation(TOGGLE_LIKE);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    try {
      await addCommentMut({ variables: { id, text: t } });
      setText('');
      await refetch();
      onChanged();
    } catch (e: any) {
      // surface in dialog (simple alert)
      alert(e.message);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {idea?.title ?? 'Pod idea'}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          ×
        </IconButton>
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
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              <Avatar
                src={idea.author?.profile_photo || undefined}
                sx={{ width: 40, height: 40 }}
              >
                {(idea.author?.first_name?.[0] ?? 'U').toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {idea.author?.full_name ?? 'Member'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelative(idea.created_at)}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {idea.description}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Button
                size="small"
                startIcon={
                  idea.liked_by_me ? (
                    <FavoriteIcon fontSize="small" sx={{ color: 'error.main' }} />
                  ) : (
                    <FavoriteBorderIcon fontSize="small" />
                  )
                }
                onClick={async () => {
                  await toggleLikeMut({ variables: { id } });
                  await refetch();
                  onChanged();
                }}
                sx={{ color: idea.liked_by_me ? 'error.main' : 'text.secondary' }}
              >
                {idea.likes_count} like{idea.likes_count === 1 ? '' : 's'}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {idea.shares_count} share{idea.shares_count === 1 ? '' : 's'}
              </Typography>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="overline" color="text.secondary">
              Comments ({idea.comments_count})
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1, maxHeight: 320, overflowY: 'auto' }}>
              {idea.comments.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No comments yet — be the first.
                </Typography>
              )}
              {idea.comments.map((c: any) => {
                const canDelete =
                  myId && (c.author_id === myId || idea.author_id === myId);
                return (
                  <Stack key={c.id} direction="row" spacing={1.5} alignItems="flex-start">
                    <Avatar
                      src={c.author?.profile_photo || undefined}
                      sx={{ width: 32, height: 32 }}
                    >
                      {(c.author?.first_name?.[0] ?? 'U').toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Typography variant="body2" fontWeight={600}>
                          {c.author?.full_name ?? 'Member'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelative(c.created_at)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {c.text}
                      </Typography>
                    </Box>
                    {canDelete && (
                      <IconButton
                        size="small"
                        onClick={async () => {
                          await deleteCommentMut({
                            variables: { id, commentId: c.id },
                          });
                          await refetch();
                          onChanged();
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          </>
        )}
      </DialogContent>
      {idea && myId && (
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={posting}
          />
          <IconButton color="primary" onClick={submit} disabled={posting || !text.trim()}>
            <SendIcon />
          </IconButton>
        </DialogActions>
      )}
    </Dialog>
  );
}
