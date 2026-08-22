import { type MutableRefObject, type ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { DuncitColumn, TableFetch } from '@duncit/table';
import FaqsTableBase, { type FaqRow } from '../../components/FaqsTableBase';
import { partnerFaqTopics } from './partner-faq-form';
import { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Topic names come from the shared list so the chip, the filter and the
 *  form cannot name a topic three different ways. */
const topicLabels = (t: Translate): Record<string, string> =>
  Object.fromEntries(partnerFaqTopics(t).map((topic) => [topic.value, topic.label]));

const topicValue = (row: FaqRow, t: Translate) =>
  topicLabels(t)[row.partner_topic ?? ''] || row.partner_topic || '—';

const renderTopic = (row: FaqRow, t: Translate) => <Chip size="small" label={topicValue(row, t)} />;

const topicColumn = (t: Translate): DuncitColumn<FaqRow> => ({
  field: 'partner_topic',
  headerName: t('admin.faqs.topic'),
  filter: {
    type: 'select',
    options: partnerFaqTopics(t),
  },
  minWidth: 140,
  cellRenderer: (row: FaqRow) => renderTopic(row, t),
  valueGetter: (row: FaqRow) => topicValue(row, t),
});

interface Props {
  fetchRows: TableFetch<FaqRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (row: FaqRow) => void;
  onDelete: (row: FaqRow) => void;
}

export default function PartnerFaqsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <FaqsTableBase
      tableId="admin-partner-faqs"
      fetchRows={fetchRows}
      refetchRef={refetchRef}
      entityColumn={topicColumn(t)}
      toolbarActions={toolbarActions}
      emptyText='No partner FAQs yet. Click "New FAQ" to create the first one.'
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
