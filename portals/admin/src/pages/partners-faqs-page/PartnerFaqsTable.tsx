import { type MutableRefObject, type ReactNode } from 'react';
import { Chip } from '@mui/material';
import type { DuncitColumn, TableFetch } from '@duncit/table';
import FaqsTableBase, { type FaqRow } from '../../components/FaqsTableBase';
import { PARTNER_FAQ_TOPICS } from './partner-faq-form';

const TOPIC_LABELS: Record<string, string> = { VENUE: 'Venue', HOST: 'Host', PRODUCTS: 'Products' };

const topicValue = (row: FaqRow) => TOPIC_LABELS[row.partner_topic ?? ''] || row.partner_topic || '—';

const renderTopic = (row: FaqRow) => <Chip size="small" label={topicValue(row)} />;

const TOPIC_COLUMN: DuncitColumn<FaqRow> = {
  field: 'partner_topic',
  headerName: 'Topic',
  filter: {
    type: 'select',
    options: PARTNER_FAQ_TOPICS.map((t) => ({ value: t.value, label: t.label })),
  },
  minWidth: 140,
  cellRenderer: renderTopic,
  valueGetter: topicValue,
};

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
  return (
    <FaqsTableBase
      tableId="admin-partner-faqs"
      fetchRows={fetchRows}
      refetchRef={refetchRef}
      entityColumn={TOPIC_COLUMN}
      toolbarActions={toolbarActions}
      emptyText='No partner FAQs yet. Click "New FAQ" to create the first one.'
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
