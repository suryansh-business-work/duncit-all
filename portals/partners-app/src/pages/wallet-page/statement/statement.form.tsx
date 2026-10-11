import { useLazyQuery } from '@apollo/client/react';
import { useDateFormat } from '@duncit/app-settings';
import { WalletStatementDialog, type WalletStatementDialogProps } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { WALLET_STATEMENT_FILE } from '../queries';
import StatementFields from './StatementFields';

/**
 * "Download statement" on the partner's wallet. The dialog, its rules and its
 * three outcomes are `WalletStatementDialog` in @duncit/forms, shared with mWeb;
 * this binds the console's translator, clock, fields and query to it, in the
 * console's heavier dialog weight and with the button's spinner. The wallet page
 * mounts it only while it is open, so it always starts blank.
 */
export default function StatementForm({ onClose }: Readonly<Pick<WalletStatementDialogProps, 'onClose'>>) {
  const { t } = useTranslation();
  // Never cached: a statement is a point-in-time file, and its base64 has no place in the store.
  const [fetchFile] = useLazyQuery(WALLET_STATEMENT_FILE, { fetchPolicy: 'no-cache' });
  return (
    <WalletStatementDialog
      t={t}
      dateFormat={useDateFormat()}
      Fields={StatementFields}
      runQuery={fetchFile}
      closeLabel={t('shell.common.close')}
      onClose={onClose}
      fontWeight={900}
      spinner
    />
  );
}
