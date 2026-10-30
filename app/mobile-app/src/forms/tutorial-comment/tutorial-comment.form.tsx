import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { makeTutorialCommentSchema, type TutorialCommentValues } from '@duncit/forms/schemas';
import { TUTORIAL_COMMENT_MAX } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  /** Throws when the server refuses the comment. */
  onSubmit: (text: string) => Promise<void>;
}

/** The comment box at the foot of the Tutorials comment sheet. mWeb twin: tutorial-comment.form. */
export function TutorialCommentForm({ onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeTutorialCommentSchema(t), [t]);
  const [failed, setFailed] = useState(false);
  const { control, handleSubmit, reset, formState } = useForm<
    TutorialCommentValues,
    unknown,
    TutorialCommentValues
  >({
    resolver: formResolver<TutorialCommentValues>(schema),
    defaultValues: { text: '' },
  });

  const post = handleSubmit(async (values) => {
    setFailed(false);
    try {
      await onSubmit(values.text.trim());
      reset({ text: '' });
    } catch {
      setFailed(true);
    }
  });

  return (
    <YStack
      gap={6}
      paddingHorizontal={16}
      paddingVertical={10}
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      <XStack gap={8} alignItems="flex-end">
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="text"
            label={t('mweb.tutorials.commentLabel')}
            placeholder={t('mweb.tutorials.commentPlaceholder')}
            maxLength={TUTORIAL_COMMENT_MAX}
          />
        </YStack>
        <DuncitButton
          testID="tutorial-comment-post"
          label={t('mweb.tutorials.commentPost')}
          onPress={() => fireAndForget(post())}
          loading={formState.isSubmitting}
          disabled={formState.isSubmitting}
        />
      </XStack>
      {failed ? (
        <Text role="alert" fontSize={13} color="$danger">
          {t('mweb.tutorials.commentFailed')}
        </Text>
      ) : null}
    </YStack>
  );
}
