import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import type { ChallengeMediaType } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { MediumToggle } from '@/components/attendance/AttendanceOtpControls';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import {
  SUBMISSION_INITIAL_VALUES,
  makeSubmissionSchema,
  type SubmissionValues,
} from '@/forms/challenge';
import { useEntryPicker, type EntryPick } from '@/hooks/useEntryPicker';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  testID: string;
  accepted: ChallengeMediaType[];
  allowCaption: boolean;
  /** Given to a host, who submits on a competitor's behalf. */
  competitors?: { competitor_id: string; name: string }[];
  replacing: boolean;
  saving: boolean;
  /** Resolves true when the piece was uploaded and saved (the form then clears). */
  onSubmit: (values: SubmissionValues) => Promise<boolean>;
}

/** The form for a challenge submission — the Tamagui twin of mWeb's SubmissionForm (rule 27). */
export function SubmissionForm({
  testID,
  accepted,
  allowCaption,
  competitors,
  replacing,
  saving,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const picker = useEntryPicker(accepted);
  const [pickError, setPickError] = useState('');
  const { control, handleSubmit, reset } = useForm<SubmissionValues, unknown, SubmissionValues>({
    resolver: formResolver<SubmissionValues>(makeSubmissionSchema(t, !!competitors)),
    defaultValues: SUBMISSION_INITIAL_VALUES,
  });
  const file = useController({ control, name: 'file' });
  const competitor = useController({ control, name: 'competitor_id' });

  const pick = async (source: () => Promise<EntryPick>) => {
    const picked = await source();
    if (!picked) return;
    setPickError('error' in picked ? picked.error : '');
    if ('file' in picked) file.field.onChange(picked.file);
  };
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values)) reset(SUBMISSION_INITIAL_VALUES);
  });
  const fileError = pickError || file.fieldState.error?.message;
  const idleLabel = replacing
    ? t('mweb.challenge.tools.submitReplace')
    : t('mweb.challenge.tools.submit');

  return (
    <YStack gap={10}>
      {competitors ? (
        <YStack gap={6}>
          <Text fontSize={14} fontWeight="600" color="$color">
            {t('mweb.challenge.judgeCompetitor')}
          </Text>
          <XStack
            gap={6}
            flexWrap="wrap"
            role="radiogroup"
            aria-label={t('mweb.challenge.judgeCompetitor')}
          >
            {competitors.map((c) => (
              <MediumToggle
                key={c.competitor_id}
                label={c.name}
                selected={competitor.field.value === c.competitor_id}
                onPress={() => competitor.field.onChange(c.competitor_id)}
              />
            ))}
          </XStack>
          {competitor.fieldState.error?.message ? (
            <NoticeCard tone="danger" title={competitor.fieldState.error.message} />
          ) : null}
        </YStack>
      ) : null}
      <XStack gap={8} flexWrap="wrap">
        {picker.fromLibrary ? (
          <DuncitButton
            size="sm"
            variant="outline"
            disabled={saving}
            label={t('mweb.challenge.tools.chooseMedia')}
            onPress={() => picker.fromLibrary && fireAndForget(pick(picker.fromLibrary))}
            testID={`${testID}-pick-media`}
          />
        ) : null}
        {picker.fromFiles ? (
          <DuncitButton
            size="sm"
            variant="outline"
            disabled={saving}
            label={t('mweb.challenge.tools.chooseAudio')}
            onPress={() => picker.fromFiles && fireAndForget(pick(picker.fromFiles))}
            testID={`${testID}-pick-audio`}
          />
        ) : null}
      </XStack>
      {file.field.value ? (
        <Text fontSize={14} color="$color">
          {t('mweb.challenge.tools.fileChosen', { vars: { name: file.field.value.name } })}
        </Text>
      ) : null}
      {fileError ? <NoticeCard tone="danger" title={fileError} /> : null}
      {allowCaption ? (
        <FormTextField
          control={control}
          name="caption"
          label={t('mweb.challenge.tools.caption')}
          multiline
        />
      ) : null}
      <DuncitButton
        disabled={saving}
        label={saving ? t('mweb.challenge.tools.uploading') : idleLabel}
        onPress={() => fireAndForget(submit())}
        testID={`${testID}-submit`}
        fullWidth
      />
    </YStack>
  );
}
