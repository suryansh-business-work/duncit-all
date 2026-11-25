import { useMemo, useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import { Label, Text, TextArea, XStack, YStack } from 'tamagui';
import { applyMention, mentionQuery } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { TextField } from '@/components/TextField';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import type { LogMention } from '@/screens/lead/tabs/ManualLogsHtml';
import { TabIconButton } from '@/screens/lead/tabs/TabIconButton';
import { makeManualLogSchema, type ManualLogValues } from './manual-log.types';
import { MentionSuggestions } from './MentionSuggestions';

interface Props {
  values: ManualLogValues;
  /** Editing an existing log rather than writing a new one. */
  editing: boolean;
  busy: boolean;
  /** The server's answer when saving failed. */
  error?: string | null;
  onSubmit: (values: ManualLogValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * Write or edit a manual log — the portal's composer on the phone: an
 * optional title and the log itself, where typing "@" offers the CRM team and
 * picking someone tags them (they get an email when the log is saved).
 */
export function ManualLogForm({
  values,
  editing,
  busy,
  error,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(() => formResolver<ManualLogValues>(makeManualLogSchema(t)), [t]);
  const { control, handleSubmit, getValues, setValue } = useForm({
    defaultValues: values,
    resolver,
    mode: 'onTouched',
  });
  const { field: body, fieldState } = useController({ control, name: 'body' });
  const [caret, setCaret] = useState(values.body.length);
  const query = mentionQuery(body.value, caret);

  const pick = (person: LogMention) => {
    const edit = applyMention(body.value, caret, person.label);
    body.onChange(edit.text);
    setCaret(edit.caret);
    const current = getValues('mentions');
    if (!current.some((m) => m.id === person.id)) setValue('mentions', [...current, person]);
  };
  let saveLabel = editing ? t('crm.manualLogs.saveChanges') : t('crm.manualLogs.save');
  if (busy) saveLabel = t('crm.manualLogs.saving');

  return (
    <YStack
      gap="$3"
      padding="$3"
      borderWidth={1}
      borderColor="$primary"
      backgroundColor="$primarySoft"
      borderRadius={RADII.md}
      testID="manual-log-form"
    >
      <XStack alignItems="center">
        <Text flex={1} fontWeight="700" role="heading">
          {editing ? t('crm.manualLogs.editTitle') : t('crm.manualLogs.newTitle')}
        </Text>
        <TabIconButton
          icon="close"
          label={t('shell.common.cancel')}
          onPress={onCancel}
          disabled={busy}
          testID="manual-log-close"
        />
      </XStack>
      <TextField
        control={control}
        name="summary"
        label={t('crm.components.titleOptional')}
        testID="manual-log-title"
      />
      <YStack gap="$1">
        <Label htmlFor="manual-log-body" fontWeight="600">
          {t('crmApp.note.body')}
        </Label>
        <TextArea
          id="manual-log-body"
          value={body.value}
          onChangeText={(text) => {
            const atEnd = caret >= body.value.length;
            body.onChange(text);
            if (atEnd) setCaret(text.length);
          }}
          onSelectionChange={(event) => setCaret(event.nativeEvent.selection.end)}
          onBlur={body.onBlur}
          placeholder={t('crm.manualLogs.placeholder')}
          placeholderTextColor="$muted"
          aria-label={t('crmApp.note.body')}
          aria-invalid={Boolean(fieldState.error)}
          borderColor={fieldState.error ? '$danger' : '$inputBorder'}
          backgroundColor="$surface"
          minHeight={120}
          testID="manual-log-body"
        />
        {fieldState.error?.message ? (
          <Text color="$danger" fontSize="$2" role="alert" testID="manual-log-body-error">
            {fieldState.error.message}
          </Text>
        ) : null}
      </YStack>
      {query === null ? null : <MentionSuggestions query={query} onPick={pick} />}
      <Text color="$muted" fontSize="$2">
        {t('crm.manualLogs.mentionHint')}
      </Text>
      {error ? (
        <Text color="$danger" role="alert" testID="manual-log-error">
          {error}
        </Text>
      ) : null}
      <XStack justifyContent="flex-end" gap="$2">
        <DuncitButton
          label={t('shell.common.cancel')}
          onPress={onCancel}
          variant="ghost"
          disabled={busy}
          testID="manual-log-cancel"
        />
        <DuncitButton
          label={saveLabel}
          onPress={handleSubmit(onSubmit)}
          loading={busy}
          testID="manual-log-save"
        />
      </XStack>
    </YStack>
  );
}
