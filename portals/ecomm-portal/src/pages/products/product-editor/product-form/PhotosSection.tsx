import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import RhfImageList from '../../../../components/form/RhfImageList';
import { MAX_PHOTOS, type ProductControl } from './product.types';

/** The product's pictures, in the order the store shows them — the first is the cover on every card. */
export default function PhotosSection({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.productEditor.photos')} subtitle={t('ecommPortal.productEditor.photosHint', { vars: { max: MAX_PHOTOS } })}>
      <RhfImageList
        control={control}
        name="images"
        label={t('ecommPortal.productEditor.productPhotos')}
        addLabel={t('ecommPortal.productEditor.addPhoto')}
        testId="product-section-photos"
      />
    </SectionCard>
  );
}
