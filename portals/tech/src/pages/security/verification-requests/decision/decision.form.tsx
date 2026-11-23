import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import Facts from '../../Facts';
import { LOCATION_ERROR_KEY, enumLabel } from '../../labels';
import type { RequestRow } from '../queries';
import {
  NOTE_MAX_LENGTH,
  blankDecision,
  decisionSchema,
  type DecisionForm as Values,
} from './decision.types';

interface Props {
  request: RequestRow;
  /** True to approve, false to reject. */
  approve: boolean;
  busy: boolean;
  onSubmit: (values: Values) => void;
  onCancel: () => void;
}

/**
 * Who is asking, why, and the one optional line the decision carries.
 *
 * The full reason is shown here rather than trusted to a table cell that cuts it
 * off: this is the last place a reviewer reads it before deciding.
 */
export default function DecisionFormBody({ request, approve, busy, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () => decisionSchema({ noteTooLong: t('tech.verificationRequests.noteTooLong', { vars: { max: NOTE_MAX_LENGTH } }) }),
    [t],
  );
  const { control, handleSubmit } = useForm<Values, unknown, Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values, unknown, Values>,
    defaultValues: blankDecision,
  });

  return (
    <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit(onSubmit)} data-testid="decision-form">
      <Alert severity={approve ? 'info' : 'warning'} variant="outlined">
        {approve ? t('tech.verificationRequests.approveHint') : t('tech.verificationRequests.rejectHint')}
      </Alert>
      <Facts
        items={[
          { label: t('tech.verificationRequests.colPerson'), value: request.user_name },
          { label: t('tech.verificationRequests.colPortal'), value: request.portal_key },
          { label: t('tech.verificationRequests.colReason'), value: request.reason, wide: true },
          {
            label: t('tech.verificationRequests.colLocationProblem'),
            value: enumLabel(t, LOCATION_ERROR_KEY, request.location_error),
            wide: true,
          },
        ]}
      />
      <RhfTextField
        control={control}
        name="note"
        label={t('tech.verificationRequests.noteLabel')}
        hint={t('tech.verificationRequests.noteHint')}
        multiline
        minRows={2}
        data-testid="decision-note"
      />
      <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1 }}>
        <DuncitButton onClick={onCancel} disabled={busy} data-testid="decision-cancel">
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          type="submit"
          variant="contained"
          color={approve ? 'primary' : 'error'}
          loading={busy}
          data-testid="decision-submit"
        >
          {approve ? t('tech.verificationRequests.approve') : t('tech.verificationRequests.reject')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
