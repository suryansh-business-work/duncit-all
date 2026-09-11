/**
 * How a Duncit Coin ledger row is named to the member who owns it — one
 * answer for mWeb and native (rule 40).
 *
 * The stored type only says which way the coins moved. A CREDIT is always
 * earned, but a DEBIT is one of two very different things: coins the member
 * spent, or coins that lapsed unspent (source `COIN_EXPIRY`, written by the
 * server's expiry sweep). Calling an expiry "Redeemed" would tell the member
 * they spent coins they never used, so the row's source decides.
 *
 * Answers with the localization KEY rather than the words, each written out as
 * a literal so the translation gate can see it — a key is never composed.
 */

/** The ledger source of a lapsed grant. Server twin: `CoinTxnSource`. */
const COIN_EXPIRY_SOURCE = 'COIN_EXPIRY';

export type CoinLedgerLabelKey = 'mweb.coin.earned' | 'mweb.coin.redeemed' | 'mweb.coin.expired';

export function coinLedgerLabelKey(
  row: Readonly<{ type: string; source: string }>,
): CoinLedgerLabelKey {
  if (row.type === 'CREDIT') return 'mweb.coin.earned';
  return row.source === COIN_EXPIRY_SOURCE ? 'mweb.coin.expired' : 'mweb.coin.redeemed';
}
