import { useMemo } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Chip, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import FaqPageIntro from './FaqPageIntro';
import FaqsTableBase, { type FaqRow } from './FaqsTableBase';
import { FAQS_TABLE, SUPER_CATS_FOR_FAQ } from './queries';
import { FaqForm, type FaqFormValues } from './faq-form';
import { useFaqCrud } from './useFaqCrud';

type Translate = ReturnType<typeof useTranslation>['t'];

interface SuperCategory {
  id: string;
  name: string;
}

const renderSuperCategory = (row: FaqRow, t: Translate) => {
  if (row.super_category) {
    return <Chip size="small" label={row.super_category.name} variant="outlined" />;
  }
  return <Chip size="small" label={t('support.faqs.general')} />;
};

const toFaqInput = (values: FaqFormValues) => ({
  audience: 'APP',
  super_category_id: values.category || null,
  question: values.question.trim(),
  answer: values.answer.trim(),
  sort_order: Number(values.sort_order) || 0,
  is_active: values.is_active,
});

const readSuperCategory = (row: FaqRow) => row.super_category_id ?? '';

export default function FaqsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();

  const { data } = useQuery<{ categories: SuperCategory[] }>(SUPER_CATS_FOR_FAQ);
  const supers = useMemo(() => data?.categories ?? [], [data]);

  // This page manages App FAQs only — pin the audience alongside the table's filters.
  const fetchRows = useApolloTableFetch<FaqRow>(client, FAQS_TABLE, 'faqsTable', {
    extraFilters: [{ field: 'audience', op: 'eq', value: 'APP' }],
  });

  const crud = useFaqCrud({
    defaultCategory: '',
    readCategory: readSuperCategory,
    toInput: toFaqInput,
    messages: {
      created: t('support.faqs.created'),
      updated: t('support.faqs.updated'),
      deleted: t('shell.common.deleted'),
      deleteTitle: t('support.faqs.deleteTitle'),
    },
  });

  const entityColumn = useMemo<DuncitColumn<FaqRow>>(
    () => ({
      field: 'super_category_id',
      headerName: t('support.faqs.superCategory'),
      filter: {
        type: 'select',
        options: supers.map((sc) => ({ value: sc.id, label: sc.name })),
      },
      minWidth: 170,
      cellRenderer: (row: FaqRow) => renderSuperCategory(row, t),
      valueGetter: (row) => row.super_category?.name ?? t('support.faqs.general'),
    }),
    [supers, t],
  );

  const categoryOptions = useMemo(
    () => supers.map((sc) => ({ value: sc.id, label: sc.name })),
    [supers],
  );

  const formTitle = crud.editing ? t('support.faqs.editTitle') : t('support.faqs.newTitle');

  return (
    <Stack spacing={2}>
      <FaqPageIntro
        title={t('support.faqs.appTitle')}
        description={t('support.faqs.subtitle')}
        hint={t('support.faqs.hint')}
      />
      <FaqsTableBase
        tableId="support-faqs"
        fetchRows={fetchRows}
        refetchRef={crud.refetchRef}
        entityColumn={entityColumn}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={crud.openNew}>
            {t('support.faqs.newFaq')}
          </DuncitButton>
        }
        emptyText={t('support.faqs.empty')}
        onEdit={crud.openEdit}
        onDelete={crud.remove}
      />
      <FaqForm
        open={crud.open}
        title={formTitle}
        categoryLabel={t('support.faqs.superCategory')}
        categoryOptions={categoryOptions}
        categoryEmptyLabel={t('support.faqs.generalOption')}
        categoryHint={t('support.faqs.generalHint')}
        initialValues={crud.values}
        saving={crud.saving}
        error={crud.error}
        onClose={crud.close}
        onSubmit={crud.submit}
      />
    </Stack>
  );
}
