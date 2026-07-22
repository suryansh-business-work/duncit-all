import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import {
  CREATE_IDEA,
  DELETE_IDEA,
  POD_IDEAS,
  SHARE,
  TOGGLE_LIKE,
} from './queries';
import ConfirmDialog from '../../components/ConfirmDialog';
import CategoryCascade, {
  EMPTY_CATEGORY_SCOPE,
  type CategoryLabels,
  type CategoryScope,
} from './CategoryCascade';
import IdeaComposerDialog from './IdeaComposerDialog';
import IdeaDetailsDialog from './IdeaDetailsDialog';
import IdeasList from './IdeasList';
import PodIdeasHeader from './PodIdeasHeader';
import { ideaMatchesScope } from '../../utils/ideaCategory';

const EMPTY_LABELS: CategoryLabels = {
  super_category_name: '',
  category_name: '',
  sub_category_name: '',
};

export default function PodIdeasPage() {
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState<CategoryScope>(EMPTY_CATEGORY_SCOPE);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<CategoryScope>(EMPTY_CATEGORY_SCOPE);
  const [labels, setLabels] = useState<CategoryLabels>(EMPTY_LABELS);
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

  const visibleIdeas = useMemo(
    () => ideas.filter((i) => ideaMatchesScope(i, filterScope)),
    [ideas, filterScope]
  );
  const visibleMyIdeas = useMemo(
    () => myIdeas.filter((i) => ideaMatchesScope(i, filterScope)),
    [myIdeas, filterScope]
  );

  const [createMut, { loading: creating }] = useMutation(CREATE_IDEA);
  const [toggleLikeMut] = useMutation(TOGGLE_LIKE);
  const [shareMut] = useMutation(SHARE);
  const [deleteMut] = useMutation(DELETE_IDEA);

  const refetchAll = async () => {
    await Promise.all([refetch(), myId ? refetchMine() : Promise.resolve()]);
  };

  const onCategoryChange = (next: CategoryScope, nextLabels: CategoryLabels) => {
    setScope(next);
    setLabels(nextLabels);
  };

  const submit = async () => {
    setComposerErr(null);
    if (!title.trim() || !description.trim()) {
      setComposerErr('Title and description are both required');
      return;
    }
    if (!scope.super_category_id || !scope.category_id || !scope.sub_category_id) {
      setComposerErr('Please select a Super Category, Category and Sub Category');
      return;
    }
    try {
      await createMut({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim(),
            ...scope,
            ...labels,
          },
        },
      });
      setComposerOpen(false);
      setTitle('');
      setDescription('');
      setScope(EMPTY_CATEGORY_SCOPE);
      setLabels(EMPTY_LABELS);
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
    const url = `${globalThis.window.location.origin}/pod-ideas?id=${idea.id}`;
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
      <PodIdeasHeader
        search={search}
        setSearch={setSearch}
        onShare={() => {
          if (!me) {
            setToast('Please sign in to share an idea');
            return;
          }
          setComposerOpen(true);
        }}
      />

      <Stack spacing={0.75} sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          Filter by category
        </Typography>
        <CategoryCascade value={filterScope} onChange={setFilterScope} allowAll />
      </Stack>

      <IdeasList
        loading={loading}
        hasData={!!data}
        ideas={visibleIdeas}
        myIdeas={visibleMyIdeas}
        myId={myId}
        onOpen={setDetailsId}
        onLike={toggleLike}
        onShare={share}
        onDelete={setConfirmDeleteId}
      />

      <IdeaComposerDialog
        open={composerOpen}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        scope={scope}
        onCategoryChange={onCategoryChange}
        error={composerErr}
        creating={creating}
        onClose={() => setComposerOpen(false)}
        onSubmit={submit}
      />

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
