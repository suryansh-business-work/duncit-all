import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import {
  APPEAL_NOTE_MAX,
  EMPTY_APPEAL_DECISION,
  makeAppealDecisionSchema,
  type AppealDecision,
  type AppealDecisionValues,
} from './appeal-decision.types';

interface Props {
  /** The dialog's confirm button submits this form by id from its actions bar. */
  formId: string;
  decision: AppealDecision;
  disabled: boolean;
  onSubmit: (values: AppealDecisionValues) => Promise<void>;
}

type DecisionResolver = Resolver<AppealDecisionValues, unknown, AppealDecisionValues>;

/**
 * Legal's note to the person who appealed. It reaches them in the app and in
 * the email, so it is written to them, not about them. The dialog is mounted
 * per verdict, so each opens on an empty note.
 */
export default function AppealDecisionForm({ formId, decision, disabled, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeAppealDecisionSchema(t, decision), [t, decision]);
  const { control, handleSubmit } = useForm<AppealDecisionValues, unknown, AppealDecisionValues>({
    resolver: zodResolver(schema) as unknown as DecisionResolver,
    defaultValues: EMPTY_APPEAL_DECISION,
    mode: 'onTouched',
  });

  return (
    <form id={formId} data-testid="appeal-decision-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <RhfTextField
        control={control}
        name="note"
        label={t('healthAppeals.noteLabel')}
        placeholder={t('healthAppeals.notePlaceholder')}
        required={decision === 'DENY'}
        disabled={disabled}
        fullWidth
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: APPEAL_NOTE_MAX, 'data-testid': 'appeal-decision-note' } }}
      />
    </form>
  );
}
