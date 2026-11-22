import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Box, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { parseApiError, roleLabelKey } from '@duncit/utils';
import PageHeader from '../shared/PageHeader';
import { DELETE_ASK_DUNCIT_KNOWLEDGE } from '../shared/mutations';
import { ASK_DUNCIT_KNOWLEDGE_TABLE } from '../shared/queries';
import type { KnowledgeRow } from '../shared/types';
import KnowledgeDialog from './KnowledgeDialog';

const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

/**
 * Ask Duncit › Knowledge Base — the articles and SOPs the assistant answers
 * from. Only PUBLISHED articles reach it, and only for the roles they name
 * (none = everyone). The app's FAQs are searched too, without copying them here.
 */
export default function AskDuncitKnowledgePage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<KnowledgeRow>(client, ASK_DUNCIT_KNOWLEDGE_TABLE, 'askDuncitKnowledgeTable');
  const [remove] = useMutation(DELETE_ASK_DUNCIT_KNOWLEDGE);
  const [editing, setEditing] = useState<string | null>(null);

  const onDelete = useCallback(
    async (row: KnowledgeRow) => {
      const ok = await confirm({ title: t('ai.askDuncit.knowledge.deleteTitle'), message: row.title, destructive: true, confirmLabel: t('ai.askDuncit.delete') });
      if (!ok) return;
      try {
        await remove({ variables: { id: row.id } });
        refetchRef.current?.();
      } catch (e) {
        notifyError(parseApiError(e) || t('ai.askDuncit.saveFailed'));
      }
    },
    [confirm, remove, t]
  );

  const columns = useMemo<DuncitColumn<KnowledgeRow>[]>(
    () => [
      { field: 'title', type: 'text', headerName: t('ai.askDuncit.knowledge.titleLabel'), flex: 1, minWidth: 260, valueGetter: (row) => row.title },
      { field: 'kind', headerName: t('ai.askDuncit.knowledge.kind'), width: 110, type: 'enum', options: options(['ARTICLE', 'SOP', 'FAQ', 'POLICY']), valueGetter: (row) => row.kind },
      {
        field: 'status',
        headerName: t('ai.askDuncit.knowledge.status'),
        width: 130,
        type: 'enum',
        options: options(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
        valueGetter: (row) => row.status,
        cellRenderer: (row) => <Chip size="small" color={row.status === 'PUBLISHED' ? 'success' : 'default'} label={row.status} />,
      },
      {
        field: 'audience_roles',
        type: 'text',
        headerName: t('ai.askDuncit.knowledge.audience'),
        width: 200,
        sortable: false,
        filterable: false,
        valueGetter: (row) => (row.audience_roles.length ? row.audience_roles.map((r) => t(roleLabelKey(r))).join(', ') : t('ai.askDuncit.knowledge.everyone')),
      },
      { field: 'hits', headerName: t('ai.askDuncit.knowledge.hits'), width: 90, type: 'number', valueGetter: (row) => row.hits },
      { field: 'version', type: 'number', headerName: t('ai.askDuncit.knowledge.version'), width: 90, sortable: false, filterable: false, valueGetter: (row) => row.version },
      dateColumn<KnowledgeRow>({ field: 'updated_at', headerName: t('ai.askDuncit.col.updated'), width: 165 }),
      {
        field: 'actions',
        type: 'actions',
        headerName: '',
        width: 60,
        sortable: false,
        filterable: false,
        cellRenderer: (row) => (
          <DuncitIconButton size="small" aria-label={t('ai.askDuncit.delete')} onClick={(e) => { e.stopPropagation(); onDelete(row).catch(() => undefined); }}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        ),
      },
    ],
    [t, onDelete]
  );
  const getRowId = useCallback((row: KnowledgeRow) => row.id, []);

  return (
    <Box>
      <PageHeader
        title={t('ai.askDuncit.knowledge.title')}
        subtitle={t('ai.askDuncit.knowledge.subtitle')}
        actions={<DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>{t('ai.askDuncit.knowledge.new')}</DuncitButton>}
      />
      <DuncitTable tableId="ai.askDuncit.knowledge" columns={columns} fetchRows={fetchRows} getRowId={getRowId} refetchRef={refetchRef} onRowClick={(row) => setEditing(row.id)} defaultSort={{ field: 'updated_at', dir: 'desc' }} emptyText={t('ai.askDuncit.knowledge.empty')} />
      <KnowledgeDialog articleId={editing} onClose={() => setEditing(null)} onSaved={() => refetchRef.current?.()} />
    </Box>
  );
}
