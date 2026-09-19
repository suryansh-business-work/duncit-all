import { useMemo } from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import ListEditorPage from '../../components/ListEditorPage';
import ProductThumb from '../../components/ProductThumb';
import RowMeta from '../../components/RowMeta';
import { useListEditor } from '../../components/useListEditor';
import { flattenCategories, siblingIds } from '../../lib/taxonomy';
import {
  DELETE_CATEGORY,
  REORDER_CATEGORIES,
  SAVE_CATEGORY,
  STORE_CATEGORIES,
  type StoreCategory,
} from '../../queries/taxonomy';
import { useTaxonomyOptions } from '../../queries/useTaxonomyOptions';
import CategoryForm from './category-form';

const DOCS = { save: SAVE_CATEGORY, remove: DELETE_CATEGORY, reorder: REORDER_CATEGORIES, list: STORE_CATEGORIES };

/**
 * The store's aisles as a tree: each parent followed by its sub-categories,
 * indented. Moving a row reorders it among its own siblings only.
 */
export default function CategoriesPage() {
  const { t } = useTranslation();
  const taxonomy = useTaxonomyOptions();
  const editor = useListEditor<StoreCategory>(DOCS);
  const { categories } = taxonomy;
  const tree = useMemo(() => flattenCategories(categories), [categories]);
  const depthOf = useMemo(() => new Map(tree.map(({ node, depth }) => [node.id, depth])), [tree]);
  return (
    <ListEditorPage<StoreCategory>
      title={t('ecommPortal.nav.categories')}
      subtitle={t('ecommPortal.categories.subtitle')}
      addLabel={t('ecommPortal.categories.add')}
      emptyText={t('ecommPortal.categories.empty')}
      items={tree.map(({ node }) => node)}
      loading={taxonomy.loading}
      error={taxonomy.error}
      editor={editor}
      deleteMessage={t('ecommPortal.categories.deleteMessage')}
      getName={(category) => category.name}
      getDepth={(category) => depthOf.get(category.id) ?? 0}
      siblingsOf={(category) => siblingIds(categories, category)}
      renderLeading={(category) => <ProductThumb src={category.image_url || category.banner_url} />}
      renderSecondary={(category) => (
        <RowMeta slug={category.slug} active={category.is_active}>
          {!category.show_in_menu && <Chip size="small" variant="outlined" label={t('ecommPortal.categories.notInMenu')} />}
        </RowMeta>
      )}
      renderForm={(props) => (
        <CategoryForm {...props} categories={categories} petTypeOptions={taxonomy.petTypeOptions} />
      )}
    />
  );
}
