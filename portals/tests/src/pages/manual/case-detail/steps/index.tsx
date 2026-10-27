import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import type { ManualCase } from '../../shared/types';
import { useSectionSave } from '../useSaveCase';
import CaseStepsForm from './case-steps.form';

interface Props {
  record: ManualCase;
}

/** Steps have no id; a step is keyed by its text and how many identical steps came before it. */
function keyedSteps(steps: ManualCase['steps']) {
  const seen = new Map<string, number>();
  return steps.map((step) => {
    const text = `${step.action}\n${step.expected}`;
    const occurrence = (seen.get(text) ?? 0) + 1;
    seen.set(text, occurrence);
    return { ...step, key: `${text}#${occurrence}` };
  });
}

/** The case's steps, numbered — read as a list, edited as a form. */
export default function CaseSteps({ record }: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const { state, save } = useSectionSave(record, 'CaseSteps');
  const title = t('testsManual.field.steps');

  const view =
    record.steps.length === 0 ? (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('testsManual.steps.empty')}
      </Typography>
    ) : (
      <Stack component="ol" spacing={1.5} sx={{ m: 0, pl: 3 }}>
        {keyedSteps(record.steps).map((step) => (
          <li key={step.key}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {step.action}
            </Typography>
            {step.expected ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('testsManual.steps.expectedLine', { vars: { expected: step.expected } })}
              </Typography>
            ) : null}
          </li>
        ))}
      </Stack>
    );

  return (
    <SectionCard
      title={title}
      action={
        editing ? undefined : (
          <DuncitButton
            size="small"
            startIcon={<EditOutlinedIcon />}
            onClick={() => setEditing(true)}
            aria-label={t('testsManual.detail.editSection', { vars: { section: title } })}
          >
            {t('shell.common.edit')}
          </DuncitButton>
        )
      }
    >
      {editing ? (
        <CaseStepsForm
          initial={record.steps.map((step) => ({ action: step.action, expected: step.expected }))}
          state={state}
          onCancel={() => setEditing(false)}
          onSubmit={async (steps) => {
            if (await save({ steps })) setEditing(false);
          }}
        />
      ) : (
        view
      )}
    </SectionCard>
  );
}
