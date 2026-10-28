import { useState } from 'react';
import { Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { ManualTestCaseInput } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import type { ManualCase } from '../../shared/types';
import { useSectionSave } from '../useSaveCase';
import RichSectionForm from './rich-section.form';
import type { RichField } from './rich-section.types';

interface Props {
  record: ManualCase;
  field: RichField;
  title: string;
  emptyText: string;
}

/** Read-only renders go through the editor too: it re-parses stored HTML against its own schema. */
const IGNORE_CHANGE = () => undefined;

/** One rich-text section of a case: shown as written, edited in place, saved on its own. */
export default function RichSection({ record, field, title, emptyText }: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const { state, save } = useSectionSave(record, `RichSection:${field}`);
  const html = record[field];

  const submit = async (value: string) => {
    const input: ManualTestCaseInput = {};
    input[field] = value;
    if (await save(input)) setEditing(false);
  };

  const editButton = (
    <DuncitButton
      size="small"
      startIcon={<EditOutlinedIcon />}
      onClick={() => setEditing(true)}
      aria-label={t('testsManual.detail.editSection', { vars: { section: title } })}
    >
      {t('shell.common.edit')}
    </DuncitButton>
  );

  let body = (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {emptyText}
    </Typography>
  );
  if (editing) {
    body = (
      <RichSectionForm initial={html} label={title} state={state} onSubmit={submit} onCancel={() => setEditing(false)} />
    );
  } else if (html) {
    body = <DuncitRichTextInput value={html} onChange={IGNORE_CHANGE} readOnly bare ariaLabel={title} />;
  }

  return (
    <SectionCard title={title} action={editing ? undefined : editButton}>
      {body}
    </SectionCard>
  );
}
