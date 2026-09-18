import { useQuery } from '@apollo/client/react';
import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import ListEditorPage from '../../components/ListEditorPage';
import RowMeta from '../../components/RowMeta';
import { useListEditor } from '../../components/useListEditor';
import { DELETE_FACET, REORDER_FACETS, SAVE_FACET, STORE_FACETS, type StoreFacet } from '../../queries/taxonomy';
import FacetForm from './facet-form';

const DOCS = { save: SAVE_FACET, remove: DELETE_FACET, reorder: REORDER_FACETS, list: STORE_FACETS };

/** The filters shoppers narrow a shelf with, in the order the filter panel lists them. */
export default function FiltersPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(STORE_FACETS, { fetchPolicy: 'cache-and-network' });
  const editor = useListEditor<StoreFacet>(DOCS);
  return (
    <ListEditorPage<StoreFacet>
      title={t('ecommPortal.nav.filters')}
      subtitle={t('ecommPortal.filters.subtitle')}
      addLabel={t('ecommPortal.filters.add')}
      emptyText={t('ecommPortal.filters.empty')}
      items={data?.storeAdminFacets ?? []}
      loading={loading}
      error={error}
      editor={editor}
      deleteMessage={t('ecommPortal.filters.deleteMessage')}
      getName={(facet) => facet.name}
      renderSecondary={(facet) => (
        <RowMeta slug={facet.slug} active={facet.is_active}>
          <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
            {facet.options.map((option) => option.label).join(' · ')}
          </Typography>
        </RowMeta>
      )}
      renderForm={(props) => <FacetForm {...props} />}
    />
  );
}
