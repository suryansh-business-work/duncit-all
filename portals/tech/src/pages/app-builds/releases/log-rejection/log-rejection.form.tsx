import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { REVIEWER_MESSAGE_MAX, REVIEWER_MESSAGE_MIN } from '../reviewer-message';
import { logRejectionSchema, type LogRejectionValues } from './log-rejection.types';

interface Props {
  /** Pre-filled from the row the operator opened, when there is one. */
  initial: Pick<LogRejectionValues, 'version' | 'build_number'>;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: LogRejectionValues) => void;
}

export default function LogRejectionForm({ initial, busy, onCancel, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const messages = {
    versionRequired: t('tech.appBuilds.logRejectionVersionRequired'),
    versionTooLong: t('tech.appBuilds.logRejectionVersionTooLong'),
    buildTooLong: t('tech.appBuilds.logRejectionBuildTooLong'),
    messageTooShort: t('tech.appBuilds.reviewerMessageTooShort', { vars: { min: String(REVIEWER_MESSAGE_MIN) } }),
    messageTooLong: t('tech.appBuilds.reviewerMessageTooLong', { vars: { max: String(REVIEWER_MESSAGE_MAX) } }),
  };
  const { control, handleSubmit } = useForm<LogRejectionValues, any, LogRejectionValues>({
    defaultValues: { version: initial.version, build_number: initial.build_number, reviewer_message: '' },
    resolver: zodResolver(logRejectionSchema(messages)) as unknown as Resolver<LogRejectionValues, any, LogRejectionValues>,
    mode: 'onBlur',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="log-rejection-form">
      <Stack spacing={2}>
        <RhfTextField
          control={control}
          name="version"
          label={t('tech.appBuilds.colVersion')}
          hint={t('tech.appBuilds.logRejectionVersionHint')}
          required
        />
        <RhfTextField
          control={control}
          name="build_number"
          label={t('tech.appBuilds.releaseColBuild')}
          hint={t('tech.appBuilds.logRejectionBuildHint')}
        />
        <RhfTextField
          control={control}
          name="reviewer_message"
          label={t('tech.appBuilds.reviewerMessageLabel')}
          hint={t('tech.appBuilds.reviewerMessageHint')}
          multiline
          minRows={5}
          maxRows={14}
          required
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton onClick={onCancel} disabled={busy}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy}>
            {t('tech.appBuilds.logRejectionSubmit')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
