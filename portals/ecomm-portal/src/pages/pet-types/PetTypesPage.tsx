import { useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import ListEditorPage from '../../components/ListEditorPage';
import ProductThumb from '../../components/ProductThumb';
import RowMeta from '../../components/RowMeta';
import { useListEditor } from '../../components/useListEditor';
import {
  DELETE_PET_TYPE,
  REORDER_PET_TYPES,
  SAVE_PET_TYPE,
  STORE_PET_TYPES,
  type StorePetType,
} from '../../queries/taxonomy';
import PetTypeForm from './pet-type-form';

const DOCS = { save: SAVE_PET_TYPE, remove: DELETE_PET_TYPE, reorder: REORDER_PET_TYPES, list: STORE_PET_TYPES };

/** The pet types the store is browsed by, in the order the store shows them. */
export default function PetTypesPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(STORE_PET_TYPES, { fetchPolicy: 'cache-and-network' });
  const editor = useListEditor<StorePetType>(DOCS);
  return (
    <ListEditorPage<StorePetType>
      title={t('ecommPortal.nav.petTypes')}
      subtitle={t('ecommPortal.petTypes.subtitle')}
      addLabel={t('ecommPortal.petTypes.add')}
      emptyText={t('ecommPortal.petTypes.empty')}
      items={data?.storeAdminPetTypes ?? []}
      loading={loading}
      error={error}
      editor={editor}
      deleteMessage={t('ecommPortal.petTypes.deleteMessage')}
      getName={(petType) => petType.name}
      renderLeading={(petType) => <ProductThumb src={petType.icon_url || petType.image_url} />}
      renderSecondary={(petType) => <RowMeta slug={petType.slug} active={petType.is_active} />}
      renderForm={(props) => <PetTypeForm {...props} />}
    />
  );
}
