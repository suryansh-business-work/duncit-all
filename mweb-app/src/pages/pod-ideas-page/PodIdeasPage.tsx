import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SearchIcon from '@mui/icons-material/Search';
import {
  POD_IDEAS,
  CREATE_IDEA,
  TOGGLE_LIKE,
  SHARE,
  DELETE_IDEA,
} from './queries';
import IdeaCard from './IdeaCard';
import IdeaDetailsDialog from './IdeaDetailsDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function PodIdeasPage() {
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [composerErr, setComposerErr] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      /* user cancelled */
    }
  };

  const removeIdea = (id: string) => {
    setConfirmDeleteId(id);
  };

  const performDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteMut({ variables: { id: confirmDeleteId } });
      setToast('Deleted');
      setConfirmDeleteId(null);
      await refetchAll();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setDeleting(false);
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
        <Alert severity="info">No ideas yet — be the first to share one!</Alert>
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
              onChange={(e) => setDescription(e.target.value.slice(0, 2001))}
              required
              fullWidth
              multiline
              minRows={4}
              maxRows={10}
              helperText={`${description.length} / 2001 — describe the vibe, format, location, audience…`}
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
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete this idea?"
        message="This will permanently remove the idea, its likes, and all comments."
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={performDelete}
        onClose={() => !deleting && setConfirmDeleteId(null)}
      />
    </Box>
  );
}
