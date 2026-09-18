import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { BackHeader, QueryGuard } from '@duncit/ui';
import ViewOnStoreButton from '../../../components/ViewOnStoreButton';
import { runAction } from '../../../lib/actions';
import { storeLinks } from '../../../lib/store-links';
import { SAVE_COLLECTION, STORE_COLLECTION, STORE_COLLECTIONS } from '../queries';
import CollectionForm, { type toCollectionInput } from './collection-form';

const FORM_ID = 'collection-form';

/** Create a collection (`/collections/new`) or edit one (`/collections/:id`). */
export default function CollectionEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useQuery(STORE_COLLECTION, { variables: { id: id ?? '' }, skip: !id });
  const [save, saveState] = useMutation(SAVE_COLLECTION, {
    refetchQueries: [STORE_COLLECTIONS, 'StoreAdminCollectionPreview'],
  });
  const collection = data?.storeAdminCollection ?? null;

  const submit = async (input: ReturnType<typeof toCollectionInput>) => {
    let savedId = '';
    const saved = await runAction(async () => {
      const result = await save({ variables: { id: id ?? null, input } });
      savedId = result.data?.storeSaveCollection.id ?? '';
    }, t('ecommPortal.common.saved'));
    if (saved && !id && savedId) navigate(`/collections/${savedId}`, { replace: true });
  };

  const actions = (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      {collection?.is_active && <ViewOnStoreButton href={storeLinks.collection(collection.slug)} />}
      <DuncitButton type="submit" form={FORM_ID} variant="contained" startIcon={<SaveIcon />} loading={saveState.loading}>
        {t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <BackHeader
        title={collection?.name ?? t('ecommPortal.collections.newTitle')}
        eyebrow={t('ecommPortal.nav.collections')}
        backTo="/collections"
        backAriaLabel={t('ecommPortal.common.backTo', { vars: { name: t('ecommPortal.nav.collections') } })}
        actions={actions}
      />
      {id ? (
        <QueryGuard
          loading={loading && !collection}
          error={error}
          notFound={!loading && !collection}
          notFoundText={t('ecommPortal.common.notFound')}
        >
          {() => collection && <CollectionForm key={collection.id} formId={FORM_ID} initial={collection} onSubmit={submit} />}
        </QueryGuard>
      ) : (
        <CollectionForm key="new" formId={FORM_ID} initial={null} onSubmit={submit} />
      )}
    </Stack>
  );
}
