import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { CmsPageRow } from '../queries/pages';
import { useCmsLabels } from '../lib/labels';
import PublishStatus from '../components/PublishStatus';
import RowActions, { type RowAction } from '../components/RowActions';

interface Props {
  siteKey: string;
  fetchRows: TableFetch<CmsPageRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions: ReactNode;
  actionsFor: (page: CmsPageRow) => RowAction[];
}

const getRowId = (page: CmsPageRow) => page.id;

/** A site's pages and collection templates. */
export default function PagesTable({ siteKey, fetchRows, refetchRef, toolbarActions, actionsFor }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useCmsLabels();
  const { formatDateTime } = useDateFormat();

  const columns = useMemo<DuncitColumn<CmsPageRow>[]>(() => {
    const addressOf = (page: CmsPageRow) => (page.kind === 'PAGE' ? page.path : labels.collection[page.collection_type ?? 'BLOG']);
    return [
      { field: 'title', headerName: t('websiteApp.cms.pages.colTitle'), type: 'text', flex: 1, minWidth: 180 },
      { field: 'path', headerName: t('websiteApp.cms.pages.colPath'), type: 'text', flex: 1, minWidth: 160, valueGetter: addressOf },
      { field: 'kind', headerName: t('websiteApp.cms.pages.colKind'), type: 'text', width: 150, valueGetter: (page) => labels.pageKind[page.kind] },
      {
        field: 'is_published',
        headerName: t('shell.common.status'),
        type: 'boolean',
        width: 200,
        cellRenderer: (page) => <PublishStatus published={page.is_published} changes={page.has_unpublished_changes} />,
        valueGetter: (page) => (page.is_published ? t('websiteApp.cms.pages.published') : t('websiteApp.cms.pages.draft')),
      },
      {
        field: 'published',
        headerName: t('websiteApp.cms.pages.colVersion'),
        type: 'number',
        width: 110,
        valueGetter: (page) => (page.published.version ? `v${page.published.version}` : ''),
      },
      {
        field: 'updated_at',
        headerName: t('shell.common.updated'),
        type: 'date',
        width: 170,
        valueGetter: (page) => (page.updated_at ? formatDateTime(page.updated_at) : ''),
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        type: 'actions',
        width: 110,
        cellRenderer: (page) => <RowActions label={page.title} actions={actionsFor(page)} />,
      },
    ];
  }, [actionsFor, formatDateTime, labels, t]);

  return (
    <DuncitTable<CmsPageRow>
      tableId={`cms-pages-${siteKey}`}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('websiteApp.cms.pages.empty')}
      defaultSort={{ field: 'path', dir: 'asc' }}
      refetchRef={refetchRef}
    />
  );
}
