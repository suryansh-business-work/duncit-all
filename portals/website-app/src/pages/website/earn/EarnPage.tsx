import { useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Alert, Paper, Skeleton, Stack } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { EarnForm, toEarnInput, type EarnFormOutput, type EarnSite } from './earn-form';
import {
  EARN_SITE_TABS,
  SAVE_WEBSITE_EARN_SECTION,
  WEBSITE_EARN_SECTIONS,
  type SaveWebsiteEarnSectionData,
  type WebsiteEarnSectionsData,
} from './queries';

/** Earn with Duncit — the section and floating pill each marketing home page shows. */
export default function EarnPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const tabs = useTabParam<EarnSite>({ items: EARN_SITE_TABS, fallback: 'MAIN' });
  const site = tabs.value;
  const { data, loading, error } = useQuery<WebsiteEarnSectionsData>(WEBSITE_EARN_SECTIONS);
  const [saveSection] = useMutation<SaveWebsiteEarnSectionData>(SAVE_WEBSITE_EARN_SECTION, {
    // The sections have no id to normalise on, so the saved one is written back
    // over its site's entry in the list read by hand.
    onCompleted(result) {
      const saved = result.saveWebsiteEarnSection;
      client.cache.updateQuery<WebsiteEarnSectionsData>({ query: WEBSITE_EARN_SECTIONS }, (current) =>
        /* v8 ignore next 3 -- a save is only possible from the loaded list, so the entry is always in the cache */
        current
          ? { websiteEarnSections: current.websiteEarnSections.map((row) => (row.site === saved.site ? saved : row)) }
          : current,
      );
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async (values: EarnFormOutput) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      await saveSection({ variables: { input: toEarnInput(values, site) } });
      notifySuccess(t('websiteApp.earn.saved'));
    } catch {
      setSaveError(t('websiteApp.earn.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const section = data?.websiteEarnSections.find((row) => row.site === site);

  return (
    <Stack spacing={2}>
      <PageHeader title={t('websiteApp.earn.title')} subtitle={t('websiteApp.earn.subtitle')} titleWeight={700} />
      <DuncitTabs
        {...tabs}
        variant="scrollable"
        onChange={(value) => {
          setSaveError(null);
          tabs.onChange(value);
        }}
      />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        {loading && <Skeleton variant="rounded" height={320} />}
        {error && !loading && <Alert severity="error">{t('websiteApp.earn.loadFailed')}</Alert>}
        {!loading && !error && !section && <Alert severity="info">{t('websiteApp.earn.empty')}</Alert>}
        {section && (
          <EarnForm
            // A tab switch or a fresh save remounts the form onto that site's stored values.
            key={`${section.site}-${section.updated_at ?? 'default'}`}
            section={section}
            submitting={submitting}
            errorMessage={saveError}
            onSubmit={(values) => {
              save(values).catch(() => setSaveError(t('websiteApp.earn.saveFailed')));
            }}
          />
        )}
      </Paper>
    </Stack>
  );
}
