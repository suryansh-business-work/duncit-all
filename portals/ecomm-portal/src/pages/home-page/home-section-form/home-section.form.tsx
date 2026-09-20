import { useWatch } from 'react-hook-form';
import { Box, Divider, ListItemText, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../components/FormDialog';
import type { ListFormProps } from '../../../components/ListEditorPage';
import RhfDateTimeField from '../../../components/form/RhfDateTimeField';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import type { Option } from '../../../lib/translate';
import type { SectionKind, StoreSection } from '../queries';
import { TWO_COLUMNS } from '../../../lib/layout';
import { SECTION_KINDS, SECTION_KIND_HINT_KEYS, SECTION_KIND_KEYS } from '../section-kinds';
import SectionKindFields from './SectionKindFields';
import { makeHomeSectionSchema, toHomeSectionInput, toHomeSectionValues, type HomeSectionValues } from './home-section.types';

interface HomeSectionFormProps extends ListFormProps<StoreSection> {
  collectionOptions: readonly Option[];
  categoryOptions: readonly Option[];
}

/** Add or edit one band of the store's home page, and when it shows. */
export default function HomeSectionForm({
  initial,
  busy,
  onClose,
  onSubmit,
  collectionOptions,
  categoryOptions,
}: Readonly<HomeSectionFormProps>) {
  const { t, form } = useSchemaForm<HomeSectionValues>(makeHomeSectionSchema, toHomeSectionValues(initial));
  const { control, handleSubmit } = form;
  const kind = useWatch({ control, name: 'kind' });
  const endsHint = kind === 'FLASH_SALE' ? t('ecommPortal.homePage.saleEndsHint') : t('ecommPortal.homePage.blankForever');
  return (
    <FormDialog
      formId="home-section-form"
      title={initial ? t('ecommPortal.homePage.editTitle') : t('ecommPortal.homePage.newTitle')}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit((values) => onSubmit(toHomeSectionInput(values)))}
      maxWidth="md"
    >
      <Stack spacing={1}>
        <RhfTextField
          control={control}
          name="kind"
          label={t('ecommPortal.homePage.kind')}
          select
          hint={t(SECTION_KIND_HINT_KEYS[kind])}
          slotProps={{ select: { renderValue: (value) => t(SECTION_KIND_KEYS[value as SectionKind]) } }}
        >
          {SECTION_KINDS.map((value) => (
            <MenuItem key={value} value={value}>
              <ListItemText primary={t(SECTION_KIND_KEYS[value])} secondary={t(SECTION_KIND_HINT_KEYS[value])} />
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField control={control} name="title" label={t('shell.common.title')} />
        <RhfTextField control={control} name="subtitle" label={t('ecommPortal.homePage.subtitleField')} />
        <Box sx={TWO_COLUMNS}>
          <RhfDateTimeField control={control} name="starts_at" label={t('ecommPortal.homePage.startsAt')} hint={t('ecommPortal.homePage.blankNow')} />
          <RhfDateTimeField control={control} name="ends_at" label={t('ecommPortal.homePage.endsAt')} hint={endsHint} required={kind === 'FLASH_SALE'} />
        </Box>
        <RhfSwitch control={control} name="is_active" label={t('shell.common.active')} hint={t('ecommPortal.form.activeHint')} />
        <Divider />
        <SectionKindFields kind={kind} control={control} collectionOptions={collectionOptions} categoryOptions={categoryOptions} />
      </Stack>
    </FormDialog>
  );
}
