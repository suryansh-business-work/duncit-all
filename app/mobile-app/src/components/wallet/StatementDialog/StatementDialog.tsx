import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  blankWalletStatementValues,
  buildWalletStatementVariables,
  makeWalletStatementSchema,
  WALLET_STATEMENT_IDLE,
  walletStatementDone,
  type WalletStatementOutcome,
  type WalletStatementValues,
} from '@duncit/forms/schemas';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { STATEMENT_SHARING_UNAVAILABLE, useWalletStatement } from '@/hooks/useWalletStatement';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';

import { StatementFields } from './StatementFields';

interface Props {
  onClose: () => void;
}

/**
 * "Download statement" — the wallet account statement for a period, as a PDF or
 * a CSV, handed to the OS share sheet. Same presets, same rules and the same
 * server query as mWeb's dialog (rule 27); the wallet screen mounts it only
 * while it is open, so it always starts blank.
 */
export function StatementDialog({ onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { download, busy } = useWalletStatement();
  const [outcome, setOutcome] = useState<WalletStatementOutcome>(WALLET_STATEMENT_IDLE);
  const { control, handleSubmit } = useForm<WalletStatementValues, any, WalletStatementValues>({
    resolver: formResolver<WalletStatementValues>(
      makeWalletStatementSchema(fmt.now(), fmt.timeZone, t),
    ),
    defaultValues: blankWalletStatementValues,
  });

  const failureMessage = (error: unknown): string => {
    const message = error instanceof Error ? error.message : '';
    if (message === STATEMENT_SHARING_UNAVAILABLE)
      return t('withdraw.statement.sharingUnavailable');
    return message || t('withdraw.statement.failed');
  };

  const submit = handleSubmit(async (values) => {
    setOutcome(WALLET_STATEMENT_IDLE);
    try {
      const file = await download(buildWalletStatementVariables(values, fmt.now(), fmt.timeZone));
      setOutcome(walletStatementDone(file));
    } catch (error) {
      setOutcome({ kind: 'failed', message: failureMessage(error) });
    }
  });
  const run = () => fireAndForget(submit());
  const dismiss = busy ? () => undefined : onClose;

  return (
    <DuncitDialog
      open
      onClose={dismiss}
      testID="statement-dialog"
      title={t('withdraw.statement.title')}
      closeLabel={t('mweb.common.close')}
      dismissOnBackdrop={!busy}
      footer={
        <DuncitButton
          testID="statement-submit"
          label={busy ? t('withdraw.statement.downloading') : t('withdraw.statement.download')}
          size="lg"
          fullWidth
          loading={busy}
          onPress={run}
        />
      }
    >
      <YStack gap={16}>
        <Text fontSize={13} color="$muted">
          {t('withdraw.statement.intro')}
        </Text>
        <StatementFields control={control} disabled={busy} />
        {outcome.kind === 'done' ? (
          <Text testID="statement-done" aria-live="polite" fontSize={13} color="$color">
            {outcome.empty
              ? t('withdraw.statement.emptyPeriod')
              : t('withdraw.statement.downloaded')}
          </Text>
        ) : null}
        {outcome.kind === 'failed' ? (
          <YStack gap={8}>
            <Text testID="statement-error" role="alert" fontSize={13} color="$danger">
              {outcome.message}
            </Text>
            <XStack>
              <DuncitButton
                testID="statement-retry"
                label={t('withdraw.statement.retry')}
                variant="outline"
                tone="neutral"
                size="sm"
                onPress={run}
              />
            </XStack>
          </YStack>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
