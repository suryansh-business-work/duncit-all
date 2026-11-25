import type { ReactNode } from 'react';
import { Text, XStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { DialogCard } from './DialogCard';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  submitLabel: string;
  cancelLabel: string;
  busy?: boolean;
  /** Why the last try failed, shown above the buttons. */
  error?: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  testID: string;
}

/**
 * A short form in a dialog — the portal's small dialogs and popovers (send a
 * test, ask the AI) on a phone. Back closes it unless it is working.
 */
export function FormDialog({
  open,
  title,
  children,
  submitLabel,
  cancelLabel,
  busy,
  error,
  onSubmit,
  onCancel,
  testID,
}: Readonly<Props>) {
  return (
    <DialogCard
      open={open}
      title={title}
      onRequestClose={busy ? undefined : onCancel}
      testID={testID}
    >
      {children}
      {error ? (
        <Text color="$danger" role="alert" testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
      <XStack justifyContent="flex-end" gap="$2">
        <DuncitButton
          label={cancelLabel}
          onPress={onCancel}
          variant="ghost"
          disabled={busy}
          testID={`${testID}-cancel`}
        />
        <DuncitButton
          label={submitLabel}
          onPress={onSubmit}
          loading={busy}
          testID={`${testID}-submit`}
        />
      </XStack>
    </DialogCard>
  );
}
