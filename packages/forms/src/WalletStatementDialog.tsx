import { useState, type ComponentType } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { downloadBase64File } from '@duncit/utils';
import type { Translate } from './schemas/translate';
import {
  blankWalletStatementValues,
  buildWalletStatementVariables,
  makeWalletStatementSchema,
  WALLET_STATEMENT_IDLE,
  walletStatementDone,
  type WalletStatementFile,
  type WalletStatementOutcome,
  type WalletStatementValues,
  type WalletStatementVariables,
} from './schemas/wallet-statement';
import type { WalletStatementClock, WalletStatementFormFieldsProps } from './WalletStatementFields';

/** A surface's statement query result — both name the field `myWalletStatementFile`. */
export interface WalletStatementFileData {
  myWalletStatementFile?: WalletStatementFile | null;
}

/** What that query settles with — Apollo's lazy-query result fits as it is. */
export interface WalletStatementQueryResult {
  data?: WalletStatementFileData | null;
  error?: unknown;
}

export interface WalletStatementDialogProps {
  /** The surface's translator — the copy is `withdraw.statement.*`. */
  t: Translate;
  /** The surface's clock and business time zone (`useDateFormat()`). */
  dateFormat: WalletStatementClock;
  /** The surface's fields: `WalletStatementFields` bound to its own translator, date format and picker. */
  Fields: ComponentType<WalletStatementFormFieldsProps>;
  /** Runs the surface's own statement query. Never cached: a statement is a point-in-time file. */
  runQuery: (options: { variables: WalletStatementVariables }) => Promise<WalletStatementQueryResult>;
  /** The Close button's label, from the surface's own common copy. */
  closeLabel: string;
  onClose: () => void;
  /** The weight of the title and the Download button, to match the surface's dialogs. */
  fontWeight?: number;
  /** Show the Download button's spinner while the file is fetched, instead of only disabling it. */
  spinner?: boolean;
}

/**
 * "Download statement" — the wallet account statement for a period, as a PDF or
 * a CSV. The server builds both from the same ledger rows and only ever for the
 * signed-in user; this dialog picks the period and hands the file to the
 * browser. One copy for mWeb and the partner console: each binds its own
 * translator, clock, date picker and GraphQL document. Mount it only while it
 * is open, so it starts blank.
 */
export default function WalletStatementDialog({
  t,
  dateFormat,
  Fields,
  runQuery,
  closeLabel,
  onClose,
  fontWeight = 700,
  spinner,
}: Readonly<WalletStatementDialogProps>) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WalletStatementValues>({
    resolver: zodResolver(
      makeWalletStatementSchema(dateFormat.now(), dateFormat.timeZone, t),
    ) as unknown as Resolver<WalletStatementValues>,
    defaultValues: blankWalletStatementValues,
  });
  const [outcome, setOutcome] = useState<WalletStatementOutcome>(WALLET_STATEMENT_IDLE);
  // The file is being fetched: the form locks and the dialog cannot be dismissed.
  const [loading, setLoading] = useState(false);
  const failed = (error: unknown): WalletStatementOutcome => ({
    kind: 'failed',
    message: error instanceof Error && error.message ? error.message : t('withdraw.statement.failed'),
  });

  const submit = handleSubmit(async (values) => {
    setOutcome(WALLET_STATEMENT_IDLE);
    setLoading(true);
    try {
      const result = await runQuery({
        variables: buildWalletStatementVariables(values, dateFormat.now(), dateFormat.timeZone),
      });
      const file = result.data?.myWalletStatementFile;
      if (!file) {
        setOutcome(failed(result.error));
        return;
      }
      downloadBase64File(file.content_base64, file.filename, file.mime);
      setOutcome(walletStatementDone(file));
    } catch (error) {
      setOutcome(failed(error));
    } finally {
      setLoading(false);
    }
  });

  return (
    <Dialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="xs" data-testid="statement-dialog">
      <DialogTitle sx={{ fontWeight }}>{t('withdraw.statement.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="wallet-statement-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('withdraw.statement.intro')}
          </Typography>
          <Fields control={control} errors={errors} preset={watch('preset')} disabled={loading} />
          {outcome.kind === 'done' && (
            <Alert severity={outcome.empty ? 'info' : 'success'} role="status" data-testid="statement-done">
              {outcome.empty ? t('withdraw.statement.emptyPeriod') : t('withdraw.statement.downloaded')}
            </Alert>
          )}
          {outcome.kind === 'failed' && (
            <Alert
              severity="error"
              data-testid="statement-error"
              action={
                <DuncitButton color="inherit" size="small" onClick={submit} data-testid="statement-retry">
                  {t('withdraw.statement.retry')}
                </DuncitButton>
              }
            >
              {outcome.message}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={loading} data-testid="statement-close">
          {closeLabel}
        </DuncitButton>
        <DuncitButton
          type="submit"
          form="wallet-statement-form"
          variant="contained"
          {...(spinner ? { loading } : { disabled: loading })}
          sx={{ borderRadius: 999, fontWeight }}
          data-testid="statement-submit"
        >
          {loading ? t('withdraw.statement.downloading') : t('withdraw.statement.download')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
