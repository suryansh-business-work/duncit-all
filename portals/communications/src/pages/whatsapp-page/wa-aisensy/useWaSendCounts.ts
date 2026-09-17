import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { WA_SEND_COUNTS, type WaSendCount } from '../queries';

/** One name's figures, or the sum of several names'. */
export interface WaSendTally {
  sent: number;
  attempts: number;
}

const NOTHING: WaSendTally = { sent: 0, attempts: 0 };

export type WaSendCounts = ReadonlyMap<string, WaSendTally>;

/**
 * How many messages each AiSensy campaign has produced, read once for the tab.
 *
 * One query for the whole catalogue rather than a count per row: both tabs show
 * sixty-odd rows at a time, and a per-row read would be sixty round trips to
 * answer what two `$group`s answer together.
 *
 * `cache-and-network` for the same reason the catalogue uses it — the figure is
 * a running total, so a stale one shown while the fresh one loads is right
 * until the moment it is not, and never wrong enough to hide.
 */
export function useWaSendCounts(): WaSendCounts {
  const { data } = useQuery<{ waSendCounts: WaSendCount[] }>(WA_SEND_COUNTS, {
    fetchPolicy: 'cache-and-network',
  });
  return useMemo(() => {
    const byCampaign = new Map<string, WaSendTally>();
    for (const row of data?.waSendCounts ?? []) {
      byCampaign.set(row.campaign, { sent: row.sent, attempts: row.attempts });
    }
    return byCampaign;
  }, [data]);
}

/**
 * The figure for a set of campaign names.
 *
 * A campaign row asks about one name; a template row asks about every campaign
 * that sends it, because a send addresses a CAMPAIGN and nothing is ever logged
 * against a template. One helper for both, so the two tabs cannot count the
 * same messages differently.
 */
export function tallyFor(counts: WaSendCounts, campaigns: readonly string[]): WaSendTally {
  let sent = 0;
  let attempts = 0;
  for (const name of campaigns) {
    const found = counts.get(name) ?? NOTHING;
    sent += found.sent;
    attempts += found.attempts;
  }
  return { sent, attempts };
}

/**
 * The tally flattened onto the row itself.
 *
 * Both tabs page in memory through `clientTableFetch`, which sorts by reading a
 * RAW property off the row — a `valueGetter` never reaches it — so a count that
 * only exists in the cell renderer would sort every row by `undefined`. The
 * campaign names ride along too, because clicking the figure has to know which
 * campaigns it was the figure FOR.
 */
export interface WithSendCount {
  sent_count: number;
  attempts_count: number;
  send_campaigns: string[];
}

export function withSendCounts<T>(
  rows: readonly T[],
  counts: WaSendCounts,
  campaignsOf: (row: T) => string[]
): (T & WithSendCount)[] {
  return rows.map((row) => {
    const send_campaigns = campaignsOf(row);
    const tally = tallyFor(counts, send_campaigns);
    return { ...row, send_campaigns, sent_count: tally.sent, attempts_count: tally.attempts };
  });
}
