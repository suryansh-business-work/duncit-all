import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { makeTutorialCommentSchema } from '@duncit/forms/schemas';
import { TUTORIAL_COMMENT_MAX } from '@duncit/utils';
import { logs } from '@duncit/logs';
import RhfTextField from '../../../forms/components/RhfTextField';
import { useTranslation } from '../../../i18n/useTranslation';
import { blankLearningComment, type LearningCommentFormProps, type LearningCommentFormValues } from './learning-comment.types';

/** The comment box at the foot of the Learnings comments drawer. Native twin: tutorial-comment.form. */
export default function LearningCommentForm({ onSubmit }: Readonly<LearningCommentFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeTutorialCommentSchema(t), [t]);
  const [failed, setFailed] = useState(false);
  const { control, handleSubmit, reset, formState } = useForm<LearningCommentFormValues, unknown, LearningCommentFormValues>({
    defaultValues: blankLearningComment(),
    resolver: zodResolver(schema) as unknown as Resolver<LearningCommentFormValues, unknown, LearningCommentFormValues>,
  });

  const submit = handleSubmit(async ({ text }) => {
    setFailed(false);
    try {
      await onSubmit(text.trim());
      reset(blankLearningComment());
    } catch (error) {
      logs.mWeb.warn('LearningsPage', 'addComment', { error });
      setFailed(true);
    }
  });

  return (
    <Box component="form" noValidate onSubmit={submit} data-testid="learning-comment-form">
      <Stack spacing={1}>
        {failed && <Alert severity="error">{t('mweb.tutorials.commentFailed')}</Alert>}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <RhfTextField
            control={control}
            name="text"
            label={t('mweb.tutorials.commentLabel')}
            placeholder={t('mweb.tutorials.commentPlaceholder')}
            size="small"
            multiline
            maxRows={4}
            slotProps={{ htmlInput: { maxLength: TUTORIAL_COMMENT_MAX, 'data-testid': 'learning-comment-input' } }}
          />
          <DuncitButton
            type="submit"
            variant="contained"
            endIcon={<SendIcon />}
            disabled={formState.isSubmitting}
            data-testid="learning-comment-post"
            sx={{ flexShrink: 0, mt: 0.25 }}
          >
            {t('mweb.tutorials.commentPost')}
          </DuncitButton>
        </Stack>
      </Stack>
    </Box>
  );
}
