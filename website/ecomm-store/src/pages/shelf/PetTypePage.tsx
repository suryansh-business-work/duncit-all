import { useMemo } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Loader } from '@duncit/ui';

import { useNavigationData } from '../../components/header/navigation';
import { PetTypeChips } from '../../components/PetTypeChips';
import { STORE_PET_TYPE } from '../../graphql/product';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { NotFoundContent } from '../info/NotFoundPage';
import { PetCategoryChips } from './PetCategoryChips';
import { ShelfHeading } from './ShelfHeading';
import { ShelfView } from './ShelfView';
import { useShelfFilters } from './useShelfFilters';

/** /pet/:slug — everything for one kind of pet, its aisles one tap away, the other pets too. */
export function PetTypePage() {
  const { t } = useStoreT();
  const { slug = '' } = useParams();
  const { pet_types: pets } = useNavigationData();
  const { filters, setCategory } = useShelfFilters();
  const { data, loading } = useQuery(STORE_PET_TYPE, { variables: { slug } });
  const pet = data?.storePetType;
  usePageSeo(pet?.name ?? '', pet?.description);
  const scope = useMemo(() => ({ pet_type: slug }), [slug]);
  if (loading && !pet) return <Loader label={t('ecommStore.common.loading')} />;
  if (!pet) return <NotFoundContent />;
  return (
    <ShelfView
      scope={scope}
      header={
        <ShelfHeading title={pet.name} description={pet.description} banner={pet.image_url}>
          <PetTypeChips pets={pets} selectedSlug={slug} label={t('ecommStore.filters.petType')} />
          {pet.categories.length > 0 ? (
            <PetCategoryChips petName={pet.name} categories={pet.categories} selected={filters.category} onSelect={setCategory} />
          ) : null}
        </ShelfHeading>
      }
    />
  );
}
