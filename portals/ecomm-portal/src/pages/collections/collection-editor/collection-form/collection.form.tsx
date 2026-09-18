import { Controller, useWatch, type Control } from 'react-hook-form';
import { Box, FormControl, FormControlLabel, FormHelperText, FormLabel, Grid, Radio, RadioGroup, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import { IdentityFields, SeoFields } from '../../../../components/form/IdentityFields';
import RhfImageField from '../../../../components/form/RhfImageField';
import ProductPicker from '../../../../components/ProductPicker';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import { MODE_HINT_KEYS, MODE_KEYS } from '../../modes';
import type { CollectionMode, StoreCollection } from '../../queries';
import CollectionPreview from '../CollectionPreview';
import SmartRules from '../SmartRules';
import { makeCollectionSchema, toCollectionInput, toCollectionValues, type CollectionValues } from './collection.types';

const MODES: readonly CollectionMode[] = ['MANUAL', 'SMART'];
/** The server keeps up to 500 hand-picked products. */
const MAX_PICKED = 500;

function ModeField({ control }: Readonly<{ control: Control<CollectionValues> }>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="mode"
      render={({ field }) => (
        <FormControl sx={{ mb: 2 }}>
          <FormLabel id="collection-mode-label">{t('ecommPortal.collections.mode')}</FormLabel>
          <RadioGroup row aria-labelledby="collection-mode-label" value={field.value} onChange={(_event, value) => field.onChange(value)}>
            {MODES.map((mode) => (
              <FormControlLabel key={mode} value={mode} control={<Radio />} label={t(MODE_KEYS[mode])} />
            ))}
          </RadioGroup>
          <FormHelperText>{t(MODE_HINT_KEYS[field.value])}</FormHelperText>
        </FormControl>
      )}
    />
  );
}

interface CollectionFormProps {
  /** The page's Save button submits this form by id. */
  formId: string;
  initial: StoreCollection | null;
  onSubmit: (input: ReturnType<typeof toCollectionInput>) => Promise<void>;
}

/** Everything a collection is: its details, how it is filled, its SEO — beside a preview of the saved shelf. */
export default function CollectionForm({ formId, initial, onSubmit }: Readonly<CollectionFormProps>) {
  const { t, form } = useSchemaForm<CollectionValues>(makeCollectionSchema, toCollectionValues(initial));
  const { control, handleSubmit } = form;
  const mode = useWatch({ control, name: 'mode' });
  return (
    <form id={formId} noValidate onSubmit={handleSubmit((values) => onSubmit(toCollectionInput(values)))}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={3}>
            <SectionCard title={t('ecommPortal.common.details')}>
              <Stack spacing={1}>
                <IdentityFields control={control} />
                <RhfImageField control={control} name="image_url" label={t('ecommPortal.form.image')} />
                <RhfImageField control={control} name="banner_url" label={t('ecommPortal.form.banner')} />
                <RhfSwitch control={control} name="is_active" label={t('shell.common.active')} hint={t('ecommPortal.form.activeHint')} />
              </Stack>
            </SectionCard>
            <SectionCard title={t('ecommPortal.collections.products')}>
              <ModeField control={control} />
              {mode === 'MANUAL' ? <ProductPicker control={control} name="product_ids" max={MAX_PICKED} /> : <SmartRules control={control} />}
            </SectionCard>
            <SectionCard title={t('ecommPortal.common.seo')}>
              <Stack spacing={1}>
                <SeoFields control={control} />
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
            <CollectionPreview slug={initial?.slug ?? ''} />
          </Box>
        </Grid>
      </Grid>
    </form>
  );
}
