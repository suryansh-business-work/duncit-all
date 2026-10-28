import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ManualCase } from '../../shared/types';
import { useSectionSave } from '../useSaveCase';
import CaseTitleForm from './case-title.form';

interface Props {
  record: ManualCase;
}

/** The case's title — the page's one heading — editable in place. */
export default function CaseTitle({ record }: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const { state, save } = useSectionSave(record, 'CaseTitle');

  if (editing) {
    return (
      <CaseTitleForm
        initial={record.title}
        state={state}
        onCancel={() => setEditing(false)}
        onSubmit={async (title) => {
          if (await save({ title })) setEditing(false);
        }}
      />
    );
  }
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
        {record.title}
      </Typography>
      <DuncitIconButton
        size="small"
        onClick={() => setEditing(true)}
        aria-label={t('testsManual.detail.editTitle')}
      >
        <EditOutlinedIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
