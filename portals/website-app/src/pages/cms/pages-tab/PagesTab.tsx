import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import type { CmsSiteRow } from '../queries/sites';
import { CMS_PAGES_TABLE, type CmsPageRow } from '../queries/pages';
import PreviewDialog from '../components/PreviewDialog';
import VersionsDialog from '../components/VersionsDialog';
import PagesTable from './PagesTable';
import ErrorPagesMenu from './ErrorPagesMenu';
import type { PagePreset } from './page-form';
import PageSettingsDialog from './PageSettingsDialog';
import DuplicateDialog from './DuplicateDialog';
import { usePageRowActions } from './usePageRowActions';
import { useCopyPreviewLink } from '../lib/useCopyPreviewLink';

/** A site's pages and collection templates, with everything you can do to one. */
export default function PagesTab({ site }: Readonly<{ site: CmsSiteRow }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refetchRef.current?.(), []);
  const [settings, setSettings] = useState<{ page: CmsPageRow | null; preset?: PagePreset } | null>(null);
  const [preview, setPreview] = useState<CmsPageRow | null>(null);
  const [duplicate, setDuplicate] = useState<CmsPageRow | null>(null);
  const [versions, setVersions] = useState<CmsPageRow | null>(null);
  const copyLink = useCopyPreviewLink();

  const fetchRows = useApolloTableFetch<CmsPageRow>(client, CMS_PAGES_TABLE, 'cmsPagesTable', { extraVariables: { siteId: site.id } }, [site.id]);
  const dialogs = useMemo(
    () => ({
      settings: (page: CmsPageRow) => setSettings({ page }),
      preview: setPreview,
      duplicate: setDuplicate,
      versions: setVersions,
      copyLink: (page: CmsPageRow) => copyLink.page(page.id),
    }),
    [copyLink],
  );
  const actionsFor = usePageRowActions(site.id, refresh, dialogs);

  return (
    <>
      <PagesTable
        siteKey={site.key}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        actionsFor={actionsFor}
        toolbarActions={
          <>
            <ErrorPagesMenu onCreate={(preset) => setSettings({ page: null, preset })} />
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setSettings({ page: null })} data-testid="cms-new-page">
              {t('websiteApp.cms.pages.new')}
            </DuncitButton>
          </>
        }
      />
      <PageSettingsDialog
        siteId={site.id}
        collections={site.collections}
        state={settings}
        onClose={() => setSettings(null)}
        onSaved={refresh}
      />
      <PreviewDialog pageId={preview?.id ?? null} title={preview?.title ?? ''} onClose={() => setPreview(null)} />
      <DuplicateDialog page={duplicate} onClose={() => setDuplicate(null)} onDuplicated={refresh} />
      <VersionsDialog
        owner={versions ? { kind: 'PAGE', id: versions.id, name: versions.title } : null}
        onClose={() => setVersions(null)}
        onRestored={refresh}
      />
    </>
  );
}
