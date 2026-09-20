import type { DuncitTabItem } from '@duncit/tabs';
import type { DnsRecord, DnsTypeGroup } from '@duncit/gql-types';

/** The tab showing the whole zone, whatever types are in it. */
export const ALL_TYPES = 'all';

/**
 * One tab per record type the zone actually holds, built from the server's own
 * counts rather than a hardcoded list — a type GoDaddy starts returning gets a
 * tab without a release.
 *
 * The count rides in the label because it is the answer to the question the tab
 * strip is usually being read for: how many A records are there, and does that
 * match the staging side.
 */
export function recordTypeTabs(
  byType: readonly DnsTypeGroup[],
  allLabel: string,
): DuncitTabItem<string>[] {
  const total = byType.reduce((sum, group) => sum + group.total, 0);
  const all: DuncitTabItem<string> = {
    value: ALL_TYPES,
    label: `${allLabel} · ${total}`,
    searchText: allLabel,
    testId: 'dns-type-tab-all',
  };
  const types = byType.map((group) => ({
    value: group.type,
    label: `${group.type} · ${group.total}`,
    searchText: group.type,
    testId: `dns-type-tab-${group.type.toLowerCase()}`,
  }));
  return [all, ...types];
}

/** The rows one tab shows — every record, or just that type's. */
export const recordsOfType = (records: readonly DnsRecord[], type: string): DnsRecord[] =>
  type === ALL_TYPES ? [...records] : records.filter((record) => record.type === type);
