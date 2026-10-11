import { useLazyQuery } from '@apollo/client/react';
import { WalletStatementDialog, type WalletStatementDialogProps } from '@duncit/forms';
import { useTranslation } from '../../../i18n/useTranslation';
import { useDateFormat } from '../../../utils/dateFormat';
import { WALLET_STATEMENT_FILE } from '../queries';
import StatementFields from './StatementFields';

/**
 * "Download statement" on mWeb's wallet. The dialog, its rules and its three
 * outcomes are `WalletStatementDialog` in @duncit/forms, shared with the partner
 * console; this binds mWeb's translator, clock, fields and query to it. The
 * wallet page mounts it only while it is open, so it starts blank.
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
      closeLabel={t('mweb.common.close')}
      onClose={onClose}
    />
  );
}
