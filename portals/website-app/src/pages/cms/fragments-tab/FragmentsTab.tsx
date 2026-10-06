import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { CmsSiteRow } from '../queries/sites';
import { CMS_FRAGMENTS_TABLE, CREATE_CMS_FRAGMENT, UPDATE_CMS_FRAGMENT, type CmsFragmentRow } from '../queries/fragments';
import { useCmsLabels } from '../lib/labels';
import { cmsErrorMessage } from '../lib/errors';
import PublishStatus from '../components/PublishStatus';
import RowActions from '../components/RowActions';
import VersionsDialog from '../components/VersionsDialog';
import { FragmentForm, toFragmentInput, type FragmentFormOutput } from './fragment-form';
import { useFragmentRowActions } from './useFragmentRowActions';
import ReelsDialog from './ReelsDialog';

const getRowId = (fragment: CmsFragmentRow) => fragment.id;

/** The site's components: headers, footers, sections and live blocks — designed once, dragged into any page. */
export default function FragmentsTab({ site }: Readonly<{ site: CmsSiteRow }>) {
  const { t } = useTranslation();
  const labels = useCmsLabels();
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => refetchRef.current?.(), []);
  const [editing, setEditing] = useState<{ fragment: CmsFragmentRow | null } | null>(null);
  const [versions, setVersions] = useState<CmsFragmentRow | null>(null);
  const [reelsOpen, setReelsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createFragment] = useMutation(CREATE_CMS_FRAGMENT);
  const [updateFragment] = useMutation(UPDATE_CMS_FRAGMENT);

  const fetchRows = useApolloTableFetch<CmsFragmentRow>(client, CMS_FRAGMENTS_TABLE, 'cmsFragmentsTable', { extraVariables: { siteId: site.id } }, [site.id]);
  const dialogs = useMemo(() => ({ rename: (fragment: CmsFragmentRow) => setEditing({ fragment }), versions: setVersions, reels: () => setReelsOpen(true) }), []);
  const actionsFor = useFragmentRowActions(site.id, refresh, dialogs);

  const columns = useMemo<DuncitColumn<CmsFragmentRow>[]>(
    () => [
      { field: 'name', headerName: t('websiteApp.cms.fragments.colName'), type: 'text', flex: 1, minWidth: 180 },
      { field: 'key', headerName: t('websiteApp.cms.fragments.colKey'), type: 'text', width: 180 },
      { field: 'kind', headerName: t('websiteApp.cms.fragments.colKind'), type: 'text', width: 130, valueGetter: (f) => (f.blocks.length ? labels.liveComponent : labels.fragmentKind[f.kind]) },
      {
        field: 'is_published',
        headerName: t('shell.common.status'),
        type: 'boolean',
        width: 200,
        cellRenderer: (f) => <PublishStatus published={f.is_published} changes={f.has_unpublished_changes} />,
      },
      { field: 'updated_at', headerName: t('shell.common.updated'), type: 'date', width: 170, valueGetter: (f) => (f.updated_at ? formatDateTime(f.updated_at) : '') },
      { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 110, cellRenderer: (f) => <RowActions label={f.name} actions={actionsFor(f)} /> },
    ],
    [actionsFor, formatDateTime, labels, t],
  );

  const save = async (values: FragmentFormOutput) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      const input = toFragmentInput(values);
      if (editing?.fragment) await updateFragment({ variables: { id: editing.fragment.id, input } });
      else await createFragment({ variables: { siteId: site.id, input } });
      setEditing(null);
      refresh();
    } catch (error) {
      setSaveError(cmsErrorMessage(error, t('websiteApp.cms.fragmentForm.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DuncitTable<CmsFragmentRow>
        tableId={`cms-fragments-${site.key}`}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('websiteApp.cms.fragments.empty')}
        defaultSort={{ field: 'kind', dir: 'asc' }}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({ fragment: null })} data-testid="cms-new-fragment">
            {t('websiteApp.cms.fragments.new')}
          </DuncitButton>
        }
      />
      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>{editing?.fragment ? t('websiteApp.cms.fragmentForm.dialogEdit') : t('websiteApp.cms.fragmentForm.dialogNew')}</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <FragmentForm
              key={editing.fragment?.id ?? 'new'}
              fragment={editing.fragment}
              submitting={submitting}
              errorMessage={saveError}
              onSubmit={(values) => {
                save(values).catch(() => setSaveError(t('websiteApp.cms.fragmentForm.saveFailed')));
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <VersionsDialog owner={versions ? { kind: 'FRAGMENT', id: versions.id, name: versions.name } : null} onClose={() => setVersions(null)} onRestored={refresh} />
      <ReelsDialog site={site} open={reelsOpen} onClose={() => setReelsOpen(false)} />
    </>
  );
}
