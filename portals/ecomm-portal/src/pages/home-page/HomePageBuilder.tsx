import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import ListEditorPage from '../../components/ListEditorPage';
import ViewOnStoreButton from '../../components/ViewOnStoreButton';
import { useListEditor } from '../../components/useListEditor';
import { storeLinks } from '../../lib/store-links';
import { useTaxonomyOptions } from '../../queries/useTaxonomyOptions';
import { STORE_COLLECTIONS } from '../collections/queries';
import HomeSectionForm from './home-section-form';
import { DELETE_SECTION, REORDER_SECTIONS, SAVE_SECTION, STORE_SECTIONS, type StoreSection } from './queries';
import { SECTION_KIND_KEYS } from './section-kinds';

const DOCS = { save: SAVE_SECTION, remove: DELETE_SECTION, reorder: REORDER_SECTIONS, list: STORE_SECTIONS };

/** A section's kind, and the schedule it shows in when one is set. */
function SectionMeta({ section }: Readonly<{ section: StoreSection }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const from = section.starts_at ? formatDateTime(section.starts_at) : t('ecommPortal.homePage.now');
  const to = section.ends_at ? formatDateTime(section.ends_at) : t('ecommPortal.homePage.forever');
  const scheduled = Boolean(section.starts_at || section.ends_at);
  const schedule = scheduled ? t('ecommPortal.homePage.schedule', { vars: { from, to } }) : '';
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
      <Chip size="small" variant="outlined" label={t(SECTION_KIND_KEYS[section.kind])} />
      {!section.is_active && <Chip size="small" variant="outlined" label={t('shell.common.inactive')} />}
      {schedule && (
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {schedule}
        </Typography>
      )}
    </Stack>
  );
}

/** The store's home page, band by band, top to bottom. */
export default function HomePageBuilder() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(STORE_SECTIONS, { fetchPolicy: 'cache-and-network' });
  const collections = useQuery(STORE_COLLECTIONS, { fetchPolicy: 'cache-and-network' });
  const taxonomy = useTaxonomyOptions();
  const editor = useListEditor<StoreSection>(DOCS);
  const collectionOptions = useMemo(
    () => (collections.data?.storeAdminCollections ?? []).map((c) => ({ value: c.id, label: c.name })),
    [collections.data],
  );
  return (
    <ListEditorPage<StoreSection>
      title={t('ecommPortal.nav.homePage')}
      subtitle={t('ecommPortal.homePage.subtitle')}
      addLabel={t('ecommPortal.homePage.add')}
      emptyText={t('ecommPortal.homePage.empty')}
      items={data?.storeAdminSections ?? []}
      loading={loading}
      error={error}
      editor={editor}
      extraActions={<ViewOnStoreButton href={storeLinks.home()} label={t('ecommPortal.homePage.viewStore')} />}
      getName={(section) => section.title || t(SECTION_KIND_KEYS[section.kind])}
      renderSecondary={(section) => <SectionMeta section={section} />}
      renderForm={(props) => (
        <HomeSectionForm {...props} collectionOptions={collectionOptions} categoryOptions={taxonomy.categoryOptions} />
      )}
    />
  );
}
