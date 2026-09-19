import { Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import RhfFieldList from '../../../../components/form/FieldList';
import RhfRichText from '../../../../components/form/RhfRichText';
import { BLANK_FAQ, BLANK_HIGHLIGHT, BLANK_SPEC, MAX_FAQS, MAX_HIGHLIGHTS, MAX_SPECS, type ProductControl } from './product.types';

/** The questions shoppers ask, answered — shown at the bottom of the product page. */
function FaqFields({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} data-testid="product-faqs">
      <Typography component="h3" variant="subtitle2">
        {t('ecommPortal.productEditor.faqs')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ecommPortal.productEditor.faqsHint')}
      </Typography>
      <RhfFieldList
        control={control}
        name="faqs"
        blank={BLANK_FAQ}
        max={MAX_FAQS}
        columns={[
          { key: 'question', label: t('ecommPortal.productEditor.faqQuestion') },
          { key: 'answer', label: t('ecommPortal.productEditor.faqAnswer'), kind: 'multiline' },
        ]}
        addLabel={t('ecommPortal.productEditor.addFaq')}
        itemLabel={(position) => t('ecommPortal.productEditor.faqN', { vars: { n: position } })}
      />
    </Stack>
  );
}

/** What the product page says: highlights, specifications, ingredients, feeding, care and FAQs. */
export default function ContentSection({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.listing.content')}>
      <Stack spacing={2} data-testid="product-section-content">
        <Typography component="h3" variant="subtitle2">
          {t('ecommPortal.listing.highlights')}
        </Typography>
        <RhfFieldList
          control={control}
          name="highlights"
          blank={BLANK_HIGHLIGHT}
          max={MAX_HIGHLIGHTS}
          columns={[{ key: 'text', label: t('ecommPortal.listing.highlight') }]}
          addLabel={t('ecommPortal.listing.addHighlight')}
          itemLabel={(position) => t('ecommPortal.listing.highlightN', { vars: { n: position } })}
        />
        <Divider />
        <Typography component="h3" variant="subtitle2">
          {t('ecommPortal.listing.specifications')}
        </Typography>
        <RhfFieldList
          control={control}
          name="specifications"
          blank={BLANK_SPEC}
          max={MAX_SPECS}
          columns={[
            { key: 'label', label: t('ecommPortal.listing.specLabel') },
            { key: 'value', label: t('ecommPortal.listing.specValue') },
          ]}
          addLabel={t('ecommPortal.listing.addSpec')}
          itemLabel={(position) => t('ecommPortal.listing.specN', { vars: { n: position } })}
        />
        <Divider />
        <RhfTextField
          control={control}
          name="ingredients"
          label={t('ecommPortal.listing.ingredients')}
          multiline
          minRows={3}
          data-testid="product-ingredients"
        />
        <RhfRichText control={control} name="feeding_guide" label={t('ecommPortal.listing.feedingGuide')} aiContext="pet store product feeding guide" />
        <RhfRichText
          control={control}
          name="care_instructions"
          label={t('ecommPortal.listing.careInstructions')}
          aiContext="pet store product care instructions"
        />
        <Divider />
        <FaqFields control={control} />
      </Stack>
    </SectionCard>
  );
}
