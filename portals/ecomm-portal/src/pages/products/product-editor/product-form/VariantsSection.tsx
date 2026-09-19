import { useFieldArray } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import VariantRow from './VariantRow';
import { blankVariant, MAX_VARIANTS, type ProductControl } from './product.types';

/**
 * Optional: the versions a shopper picks between (sizes, flavours, pack
 * counts). What they differ by is named once; each row then prices itself.
 */
export default function VariantsSection({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'variants' });
  return (
    <SectionCard title={t('ecommPortal.productEditor.variants')} subtitle={t('ecommPortal.productEditor.variantsHint')}>
      <Stack spacing={1.5} data-testid="product-section-variants">
        {fields.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="product-no-variants">
            {t('ecommPortal.productEditor.noVariants')}
          </Typography>
        ) : (
          <RhfTextField
            control={control}
            name="variant_option"
            label={t('ecommPortal.productEditor.variesBy')}
            hint={t('ecommPortal.productEditor.variesByHint')}
            data-testid="product-variant-option"
          />
        )}
        {fields.map((field, index) => (
          <VariantRow
            key={field.id}
            control={control}
            index={index}
            isFirst={index === 0}
            isLast={index === fields.length - 1}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() => remove(index)}
          />
        ))}
        <DuncitButton
          startIcon={<AddIcon />}
          onClick={() => append(blankVariant())}
          disabled={fields.length >= MAX_VARIANTS}
          sx={{ alignSelf: 'flex-start' }}
          data-testid="product-add-variant"
        >
          {t('ecommPortal.productEditor.addVariant')}
        </DuncitButton>
      </Stack>
    </SectionCard>
  );
}
