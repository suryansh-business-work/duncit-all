import { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ViewListIcon from '@mui/icons-material/ViewList';
import ArticleIcon from '@mui/icons-material/Article';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import type { CmsCollection } from '@duncit/gql-types';
import type { CmsSiteRow } from '../queries/sites';
import { CMS_ENTRIES_TABLE, DELETE_CMS_ENTRY, type CmsEntryRow } from '../queries/entries';
import { COLLECTION_SLUG, useCmsLabels } from '../lib/labels';
import { cmsErrorMessage } from '../lib/errors';
import type { RowAction } from '../components/RowActions';
import EntriesTable from './EntriesTable';
import { useOpenTemplate } from './useOpenTemplate';

interface Props {
  site: CmsSiteRow;
  collection: CmsCollection;
}

/** One collection of a site: its entries, and the templates they render through. */
export default function CollectionTab({ site, collection }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useCmsLabels();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [deleteEntry] = useMutation(DELETE_CMS_ENTRY);
  const label = labels.collection[collection];
  const template = useOpenTemplate(site.id, collection, label);
  const entryPath = useCallback((id: string) => `/sites/${site.id}/${COLLECTION_SLUG[collection]}/${id}`, [collection, site.id]);

  const fetchRows = useApolloTableFetch<CmsEntryRow>(
    client,
    CMS_ENTRIES_TABLE,
    'cmsEntriesTable',
    { extraVariables: { siteId: site.id, collection } },
    [site.id, collection],
  );

  const remove = useCallback(
    async (entry: CmsEntryRow) => {
      const ok = await confirm({
        title: t('websiteApp.cms.entries.deleteTitle'),
        message: t('websiteApp.cms.entries.deleteText', { vars: { title: entry.title } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteEntry({ variables: { id: entry.id } });
        refetchRef.current?.();
      } catch (error) {
        notifyError(cmsErrorMessage(error, t('websiteApp.cms.entries.deleteFailed')));
      }
    },
    [confirm, deleteEntry, t],
  );

  const actionsFor = useMemo(
    () =>
      (entry: CmsEntryRow): RowAction[] => [
        { key: 'edit', label: t('shell.common.edit'), icon: <EditIcon fontSize="small" />, onClick: () => navigate(entryPath(entry.id)) },
        {
          key: 'delete',
          label: t('shell.common.delete'),
          icon: <DeleteOutlineIcon fontSize="small" />,
          destructive: true,
          onClick: () => {
            remove(entry).catch(() => notifyError(t('websiteApp.cms.entries.deleteFailed')));
          },
        },
      ],
    [entryPath, navigate, remove, t],
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <DuncitButton
          variant="outlined"
          startIcon={<ViewListIcon />}
          loading={template.opening === 'COLLECTION_LIST'}
          onClick={() => {
            template.open('COLLECTION_LIST').catch(() => notifyError(t('websiteApp.cms.entries.templateFailed')));
          }}
        >
          {t('websiteApp.cms.entries.designList')}
        </DuncitButton>
        <DuncitButton
          variant="outlined"
          startIcon={<ArticleIcon />}
          loading={template.opening === 'COLLECTION_DETAIL'}
          onClick={() => {
            template.open('COLLECTION_DETAIL').catch(() => notifyError(t('websiteApp.cms.entries.templateFailed')));
          }}
        >
          {t('websiteApp.cms.entries.designDetail')}
        </DuncitButton>
      </Stack>
      <EntriesTable
        tableId={`cms-entries-${site.key}-${COLLECTION_SLUG[collection]}`}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        actionsFor={actionsFor}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => navigate(entryPath('new'))} data-testid="cms-new-entry">
            {t('websiteApp.cms.entries.new')} — {label}
          </DuncitButton>
        }
      />
    </Stack>
  );
}
