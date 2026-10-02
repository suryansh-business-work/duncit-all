import { useState } from 'react';
import { Box, Snackbar } from '@mui/material';
import ConfirmDialog from '../../../components/ConfirmDialog';
import {
  EMPTY_CATEGORY_SCOPE,
  type CategoryLabels,
  type CategoryScope,
} from '../CategoryCascade';
import IdeaComposerDialog from '../IdeaComposerDialog';
import IdeaDetailsDialog from '../IdeaDetailsDialog';
import IdeasList from '../IdeasList';
import PodIdeasHeader from '../PodIdeasHeader';
import { useTranslation } from '../../../i18n/useTranslation';
import { usePodIdeasData } from './usePodIdeasData';
import PodIdeasCategoryFilter from './PodIdeasCategoryFilter';

const EMPTY_LABELS: CategoryLabels = {
  super_category_name: '',
  category_name: '',
  sub_category_name: '',
};

export default function PodIdeasPage() {
  const { t } = useTranslation();
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

  const {
    data,
    loading,
    me,
    myId,
    visibleIdeas,
    visibleMyIdeas,
    createMut,
    creating,
    deleteMut,
    refetchAll,
    toggleLike,
    share,
  } = usePodIdeasData(search, filterScope, setToast, t);

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
      setToast(t('mweb.podIdeas.ideaSubmittedItWillAppearPublicly'));
      await refetchAll();
    } catch (e: any) {
      setComposerErr(e.message);
    }
  };

  const performDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteMut({ variables: { id: confirmDeleteId } });
      setToast(t('mweb.podIdeas.deleted'));
      setConfirmDeleteId(null);
      await refetchAll();
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box data-testid="pod-ideas-page" sx={{ maxWidth: 720, mx: 'auto', py: { xs: 1, sm: 2 } }}>
      <PodIdeasHeader
        search={search}
        setSearch={setSearch}
        onShare={() => {
          if (!me) {
            setToast(t('mweb.podIdeas.pleaseSignInToShareAn'));
            return;
          }
          setComposerOpen(true);
        }}
      />

      <PodIdeasCategoryFilter value={filterScope} onChange={setFilterScope} />

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
        data-testid="pod-ideas-page-toast"
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
      <ConfirmDialog
        testId="idea-delete-confirm"
        open={!!confirmDeleteId}
        title={t('mweb.podIdeas.deleteThisIdea')}
        message={t('mweb.podIdeas.thisWillPermanentlyRemoveTheIdea')}
        confirmLabel={t('mweb.common.delete')}
        destructive
        busy={deleting}
        onConfirm={performDelete}
        onClose={() => !deleting && setConfirmDeleteId(null)}
      />
    </Box>
  );
}
