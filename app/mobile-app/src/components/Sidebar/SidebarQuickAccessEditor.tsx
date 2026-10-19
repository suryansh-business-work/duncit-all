import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  DEFAULT_QUICK_ACCESS,
  QUICK_ACCESS_SIZE,
  moveQuickAccess,
  quickAccessEditorRows,
  toggleQuickAccess,
  type ProfileMenuFlags,
  type ProfileMenuKey,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { menuEntry } from './profileSections';
import { QuickAccessEditorRow } from './QuickAccessEditorRow';
import { makeQuickAccessSchema, type QuickAccessFormValues } from './quickAccess.form';

/**
 * "Edit Quick Access" — a small sheet where the member picks which six
 * destinations the grid shows and in what order. A pick only lands on Save.
 * mWeb twin: profile-drawer/quick-access-form.
 */
export function SidebarQuickAccessEditor({
  open,
  current,
  flags,
  saveFailed,
  onClose,
  onSave,
}: Readonly<{
  open: boolean;
  /** The grid as it is now — what the sheet opens on. */
  current: readonly ProfileMenuKey[];
  flags: ProfileMenuFlags;
  /** The last save could not be kept on the device. */
  saveFailed: boolean;
  onClose: () => void;
  onSave: (selection: ProfileMenuKey[]) => void;
}>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeQuickAccessSchema(t, flags), [t, flags]);
  const { control, handleSubmit, reset, setValue, formState } = useForm<
    QuickAccessFormValues,
    unknown,
    QuickAccessFormValues
  >({
    defaultValues: { selection: [...current] },
    resolver: formResolver<QuickAccessFormValues>(schema),
  });
  const selection = useWatch({ control, name: 'selection' });

  // The sheet stays mounted between openings: each opening starts on the grid as it is.
  useEffect(() => {
    if (open) reset({ selection: [...current] });
  }, [open, current, reset]);

  const update = (next: ProfileMenuKey[]) =>
    setValue('selection', next, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  const full = selection.length >= QUICK_ACCESS_SIZE;
  const error = formState.errors.selection?.message;

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="quick-access-editor"
      title={t('mweb.sidebar.editQuickAccess')}
      subtitle={t('mweb.sidebar.editorHint', { vars: { max: QUICK_ACCESS_SIZE } })}
      closeLabel={t('mweb.common.close')}
      footer={
        <XStack gap={12}>
          <YStack flex={1}>
            <DuncitButton
              testID="quick-access-reset"
              variant="outline"
              tone="neutral"
              fullWidth
              label={t('mweb.sidebar.editorReset')}
              onPress={() => update([...DEFAULT_QUICK_ACCESS])}
            />
          </YStack>
          <YStack flex={1}>
            <DuncitButton
              testID="quick-access-save"
              fullWidth
              label={t('mweb.sidebar.editorSave')}
              onPress={handleSubmit((values) => onSave(values.selection))}
            />
          </YStack>
        </XStack>
      }
    >
      <Text
        testID="quick-access-count"
        aria-live="polite"
        fontSize={13}
        fontWeight="600"
        color="$muted"
      >
        {t('mweb.sidebar.editorCount', {
          vars: { selected: selection.length, max: QUICK_ACCESS_SIZE },
        })}
      </Text>
      {error ? (
        <Text testID="quick-access-error" role="alert" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {saveFailed ? (
        <Text testID="quick-access-save-failed" role="alert" fontSize={13} color="$danger">
          {t('mweb.sidebar.editorSaveFailed')}
        </Text>
      ) : null}
      <YStack>
        {quickAccessEditorRows(selection, flags).map((key) => {
          const index = selection.indexOf(key);
          return (
            <QuickAccessEditorRow
              key={key}
              entry={menuEntry(key, t)}
              index={index}
              picked={index >= 0}
              pickedCount={selection.length}
              full={full}
              onToggle={() => update(toggleQuickAccess(selection, key))}
              onMove={(step) => update(moveQuickAccess(selection, index, step))}
            />
          );
        })}
      </YStack>
    </DuncitDialog>
  );
}
