/**
 * The partner wallet's "Download statement" shapes.
 *
 * Everything lives in shared packages — the form's rules, values and outcome in
 * @duncit/forms/schemas, the period presets in @duncit/utils — because mWeb and
 * the native app offer the identical statement. This file only names what the
 * console's own query answers with.
 */
import type { WalletStatementFile } from '@duncit/forms/schemas';

export {
  blankWalletStatementValues,
  type WalletStatementFile,
  type WalletStatementOutcome,
  type WalletStatementValues,
} from '@duncit/forms/schemas';

/** The `PartnerWalletStatementFile` query's result. */
export interface WalletStatementFileData {
  myWalletStatementFile: WalletStatementFile;
}
