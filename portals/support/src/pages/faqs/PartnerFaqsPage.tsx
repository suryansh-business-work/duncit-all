import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';
import { Chip, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import FaqPageIntro from './FaqPageIntro';
import FaqsTableBase, { type FaqRow } from './FaqsTableBase';
import { FAQS_TABLE } from './queries';
import { FaqForm, type FaqCategoryOption, type FaqFormValues } from './faq-form';
import { useFaqCrud } from './useFaqCrud';

type Translate = ReturnType<typeof useTranslation>['t'];

const DEFAULT_TOPIC = 'VENUE';

/** Topic names come from one list so the chip, the filter and the form cannot
 *  name a topic three different ways. */
const partnerFaqTopics = (t: Translate): FaqCategoryOption[] => [
  { value: 'VENUE', label: t('support.faqs.audienceVenue') },
  { value: 'HOST', label: t('support.faqs.audienceHost') },
  { value: 'PRODUCTS', label: t('support.faqs.audienceProducts') },
];

const topicLabel = (row: FaqRow, topics: FaqCategoryOption[]) =>
  topics.find((topic) => topic.value === row.partner_topic)?.label ?? row.partner_topic ?? '—';

/** The topic chip, built out here so the column holds a plain reference rather
 *  than a component redefined on every render (S6478). */
const renderTopic = (topics: FaqCategoryOption[]) => (row: FaqRow) => (
  <Chip size="small" label={topicLabel(row, topics)} />
);

const toPartnerFaqInput = (values: FaqFormValues) => ({
  audience: 'PARTNERS',
  partner_topic: values.category,
  question: values.question.trim(),
  answer: values.answer.trim(),
  sort_order: Number(values.sort_order) || 0,
  is_active: values.is_active,
});

const readTopic = (row: FaqRow) => row.partner_topic ?? DEFAULT_TOPIC;

export default function PartnerFaqsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const topics = useMemo(() => partnerFaqTopics(t), [t]);

  // This page manages Partner FAQs only — pin the audience alongside the table's filters.
  const fetchRows = useApolloTableFetch<FaqRow>(client, FAQS_TABLE, 'faqsTable', {
    extraFilters: [{ field: 'audience', op: 'eq', value: 'PARTNERS' }],
  });

  const crud = useFaqCrud({
    defaultCategory: DEFAULT_TOPIC,
    readCategory: readTopic,
    toInput: toPartnerFaqInput,
    messages: {
      created: t('support.faqs.partnerCreated'),
      updated: t('support.faqs.partnerUpdated'),
      deleted: t('support.faqs.partnerDeleted'),
      deleteTitle: t('support.faqs.partnerDeleteTitle'),
    },
  });

  const entityColumn = useMemo<DuncitColumn<FaqRow>>(
    () => ({
      field: 'partner_topic',
      headerName: t('support.faqs.topic'),
      filter: { type: 'select', options: topics },
      minWidth: 140,
      cellRenderer: renderTopic(topics),
      valueGetter: (row) => topicLabel(row, topics),
    }),
    [t, topics],
  );

  const formTitle = crud.editing
    ? t('support.faqs.partnerEditTitle')
    : t('support.faqs.partnerNewTitle');

  return (
    <Stack spacing={2}>
      <FaqPageIntro
        title={t('support.faqs.partnerTitle')}
        description={t('support.faqs.partnerSubtitle')}
        hint={t('support.faqs.partnerHint')}
      />
      <FaqsTableBase
        tableId="support-partner-faqs"
        fetchRows={fetchRows}
        refetchRef={crud.refetchRef}
        entityColumn={entityColumn}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={crud.openNew}>
            {t('support.faqs.newFaq')}
          </DuncitButton>
        }
        emptyText={t('support.faqs.partnerEmpty')}
        onEdit={crud.openEdit}
        onDelete={crud.remove}
      />
      <FaqForm
        open={crud.open}
        title={formTitle}
        categoryLabel={t('support.faqs.topic')}
        categoryOptions={topics}
        initialValues={crud.values}
        saving={crud.saving}
        error={crud.error}
        onClose={crud.close}
        onSubmit={crud.submit}
      />
    </Stack>
  );
}
