import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  REVIEWER_MESSAGE_MAX,
  REVIEWER_MESSAGE_MIN,
  reviewerMessageSchema,
  type ReviewerMessageValues,
} from './reviewer-message.types';

interface Props {
  initial: string;
  busy: boolean;
  onSubmit: (values: ReviewerMessageValues) => void;
}

/**
 * Where the reviewer's message goes. Neither store's API carries it, so an
 * operator pastes it here and the advice is written again with it in hand.
 */
export default function ReviewerMessageForm({ initial, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const messages = {
    tooShort: t('tech.appBuilds.reviewerMessageTooShort', { vars: { min: String(REVIEWER_MESSAGE_MIN) } }),
    tooLong: t('tech.appBuilds.reviewerMessageTooLong', { vars: { max: String(REVIEWER_MESSAGE_MAX) } }),
  };
  const { control, handleSubmit, reset } = useForm<ReviewerMessageValues, any, ReviewerMessageValues>({
    defaultValues: { message: initial },
    resolver: zodResolver(reviewerMessageSchema(messages)) as unknown as Resolver<ReviewerMessageValues, any, ReviewerMessageValues>,
    mode: 'onBlur',
  });

  // A save round-trips through the server; the field re-arms with what is stored.
  useEffect(() => {
    reset({ message: initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="reviewer-message-form">
      <Stack spacing={1.5}>
        <Typography variant="subtitle2">{t('tech.appBuilds.reviewerMessageTitle')}</Typography>
        <RhfTextField
          control={control}
          name="message"
          label={t('tech.appBuilds.reviewerMessageLabel')}
          hint={t('tech.appBuilds.reviewerMessageHint')}
          multiline
          minRows={4}
          maxRows={12}
          required
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton type="submit" variant="outlined" size="small" loading={busy}>
            {t('tech.appBuilds.reviewerMessageSave')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
