import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import Chip from '@mui/material/Chip';
import { ScrollRail } from '@duncit/ui';
import ProductReviews from '../ProductReviews';
import { formatRupees, type ProductSpec } from '../product-specs';
import { useTranslation } from '../../../i18n/useTranslation';
import BrandAttribution from './BrandAttribution';
import ProductSpecsTable from './ProductSpecsTable';
import type { ProductVariantOption } from './types';

interface Props {
  product: { id: string; product_name: string; brand_name?: string | null };
  images: string[];
  specs: ProductSpec[];
  price: number;
  mrp: number;
  variants: ProductVariantOption[];
  selectedVariantId: string | undefined;
  onPickVariant: (id: string) => void;
  brandId: string | null;
  onOpenBrand: (id: string) => void;
  description: string;
  onZoom: (index: number) => void;
}

/** The loaded product's gallery, price, variant chips, brand, description,
 * specs and reviews. */
export default function ProductDetailBody({
  product,
  images,
  specs,
  price,
  mrp,
  variants,
  selectedVariantId,
  onPickVariant,
  brandId,
  onOpenBrand,
  description,
  onZoom,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      {images.length > 0 && (
        <ScrollRail testId="product-detail-images" gap={1}>
          {images.map((url, imageIndex) => (
            <ButtonBase
              key={url}
              onClick={() => onZoom(imageIndex)}
              aria-label={t('mweb.common.zoomImage')}
              data-testid={`product-detail-image-${imageIndex}`}
              sx={{ borderRadius: '16px', flex: '0 0 auto' }}
            >
              <Box
                component="img"
                src={url}
                alt={product.product_name}
                sx={{ width: 160, height: 160, borderRadius: '16px', objectFit: 'cover' }}
              />
            </ButtonBase>
          ))}
        </ScrollRail>
      )}
      <Typography variant="h6" component="h3" data-testid="product-detail-name" sx={{ fontWeight: 600 }}>
        {product.product_name}
      </Typography>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "baseline"
      }}>
        <Typography
          variant="h5"
          component="p"
          data-testid="product-detail-price"
          sx={{ fontWeight: 700, color: 'accent.main' }}
        >
          {formatRupees(price)}
        </Typography>
        {mrp > price && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              textDecoration: 'line-through'
            }}>
            {formatRupees(mrp)}
          </Typography>
        )}
      </Stack>
      {variants.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          {variants.map((v) => (
            <Chip
              key={v.id}
              label={v.option_label || v.color || v.size_label || 'Variant'}
              onClick={() => onPickVariant(v.id)}
              aria-pressed={selectedVariantId === v.id}
              color={selectedVariantId === v.id ? 'primary' : 'default'}
              variant={selectedVariantId === v.id ? 'filled' : 'outlined'}
              size="small"
              data-testid={`variant-${v.id}`}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>
      )}
      <BrandAttribution brandName={product.brand_name} brandId={brandId} onOpenBrand={onOpenBrand} />
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          whiteSpace: 'pre-wrap'
        }}>
        {description || 'No description provided.'}
      </Typography>
      {specs.length > 0 && <ProductSpecsTable specs={specs} />}
      <ProductReviews productId={product.id} />
    </Stack>
  );
}
