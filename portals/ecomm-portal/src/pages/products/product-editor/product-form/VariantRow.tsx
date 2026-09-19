import { Box, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import MoveButtons from '../../../../components/MoveButtons';
import RhfImageList from '../../../../components/form/RhfImageList';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import type { ProductControl } from './product.types';

interface VariantRowProps {
  control: ProductControl;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

const VARIANT_GRID = {
  display: 'grid',
  columnGap: 1.5,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '2fr 1.5fr 1fr 1fr 1fr 1fr' },
} as const;

/** One variant — its option, code, price, MRP, stock, parcel weight and own photos — with move and remove. */
export default function VariantRow({ control, index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: Readonly<VariantRowProps>) {
  const { t } = useTranslation();
  const label = t('ecommPortal.productEditor.variantN', { vars: { n: index + 1 } });
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }} role="group" aria-label={label} data-testid="product-variant-row">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography component="h3" variant="subtitle2">
          {label}
        </Typography>
        <MoveButtons name={label} canMoveUp={!isFirst} canMoveDown={!isLast} onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
          <DuncitIconButton
            aria-label={t('shell.a11y.removeNamed', { vars: { name: label } })}
            onClick={onRemove}
            data-testid="product-variant-remove"
          >
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </MoveButtons>
      </Stack>
      <Box sx={VARIANT_GRID}>
        <RhfTextField
          control={control}
          name={`variants.${index}.option_label`}
          label={t('ecommPortal.productEditor.optionLabel')}
          hint={t('ecommPortal.productEditor.optionLabelHint')}
          data-testid="product-variant-label"
        />
        <RhfTextField
          control={control}
          name={`variants.${index}.sku`}
          label={t('ecommPortal.products.sku')}
          hint={t('ecommPortal.productEditor.skuHint')}
          data-testid="product-variant-sku"
        />
        <RhfNumberField control={control} name={`variants.${index}.price`} label={t('ecommPortal.products.price')} testId="product-variant-price" />
        <RhfNumberField control={control} name={`variants.${index}.mrp`} label={t('ecommPortal.products.mrp')} testId="product-variant-mrp" />
        <RhfNumberField control={control} name={`variants.${index}.stock`} label={t('ecommPortal.productEditor.stock')} whole testId="product-variant-stock" />
        <RhfNumberField
          control={control}
          name={`variants.${index}.weight_kg`}
          label={t('ecommPortal.productEditor.weight')}
          unit={t('ecommPortal.productEditor.kg')}
          testId="product-variant-weight"
        />
      </Box>
      <RhfImageList
        control={control}
        name={`variants.${index}.images`}
        label={t('ecommPortal.productEditor.variantPhotos')}
        hint={t('ecommPortal.productEditor.variantPhotosHint')}
        addLabel={t('ecommPortal.productEditor.addPhoto')}
        testId="product-variant-photos"
      />
    </Paper>
  );
}
