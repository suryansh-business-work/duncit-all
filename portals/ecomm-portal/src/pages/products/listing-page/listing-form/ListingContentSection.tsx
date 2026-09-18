import type { Control } from 'react-hook-form';
import { Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import RhfFieldList from '../../../../components/form/FieldList';
import RhfRichText from '../../../../components/form/RhfRichText';
import { BLANK_HIGHLIGHT, BLANK_SPEC, type ListingValues } from './listing.types';

/** What the product page says: highlights, specifications, ingredients, feeding and care. */
export default function ListingContentSection({ control }: Readonly<{ control: Control<ListingValues> }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.listing.content')}>
      <Stack spacing={2}>
        <Typography component="h3" variant="subtitle2">
          {t('ecommPortal.listing.highlights')}
        </Typography>
        <RhfFieldList
          control={control}
          name="highlights"
          blank={BLANK_HIGHLIGHT}
          max={12}
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
          max={40}
          columns={[
            { key: 'label', label: t('ecommPortal.listing.specLabel') },
            { key: 'value', label: t('ecommPortal.listing.specValue') },
          ]}
          addLabel={t('ecommPortal.listing.addSpec')}
          itemLabel={(position) => t('ecommPortal.listing.specN', { vars: { n: position } })}
        />
        <Divider />
        <RhfTextField control={control} name="ingredients" label={t('ecommPortal.listing.ingredients')} multiline minRows={3} />
        <RhfRichText control={control} name="feeding_guide" label={t('ecommPortal.listing.feedingGuide')} aiContext="pet store product feeding guide" />
        <RhfRichText
          control={control}
          name="care_instructions"
          label={t('ecommPortal.listing.careInstructions')}
          aiContext="pet store product care instructions"
        />
      </Stack>
    </SectionCard>
  );
}
