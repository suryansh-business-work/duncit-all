import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  DECISION_NOTE_MAX,
  makeReturnDecisionSchema,
  type ReturnDecision,
  type ReturnDecisionValues,
} from './return-decision.types';

interface Props {
  decision: ReturnDecision;
  busy: boolean;
  onSubmit: (values: ReturnDecisionValues) => void;
  onCancel: () => void;
}

/** The note that goes with approving or rejecting a return. */
export default function ReturnDecisionForm({ decision, busy, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeReturnDecisionSchema(t, decision), [t, decision]);
  const { control, handleSubmit } = useForm<ReturnDecisionValues>({
    resolver: zodResolver(schema),
    defaultValues: { note: '' },
    mode: 'onBlur',
  });
  const reject = decision === 'reject';

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit(onSubmit)} noValidate data-testid={`return-decision-${decision}`}>
      <RhfTextField
        control={control}
        name="note"
        label={reject ? t('partners.returns.rejectNoteLabel') : t('partners.returns.approveNoteLabel')}
        hint={reject ? t('partners.returns.rejectNoteHint') : t('partners.returns.approveNoteHint')}
        required={reject}
        multiline
        minRows={3}
        slotProps={{ htmlInput: { maxLength: DECISION_NOTE_MAX } }}
        data-testid="return-decision-note"
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" color={reject ? 'error' : 'primary'} loading={busy} data-testid="return-decision-submit">
          {reject ? t('partners.returns.reject') : t('partners.returns.approve')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
