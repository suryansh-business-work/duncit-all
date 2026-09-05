import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_INPUTS, type PodProfitInputs } from '../types';
import {
  entriesOfSaved,
  rowsOf,
  signatureOf,
  sumMultiPods,
  type MultiPodEntry,
  type MultiPodRow,
  type MultiPodTotals,
  type SavedMultiPodCalculator,
} from './types';

export interface MultiPodEditor {
  name: string;
  rows: MultiPodRow[];
  totals: MultiPodTotals;
  expandedKeys: ReadonlySet<string>;
  entries: MultiPodEntry[];
  /** True while the editor holds anything the server has not been told about. */
  dirty: boolean;
  setName: (name: string) => void;
  addPod: () => void;
  removePod: (podKey: string) => void;
  renamePod: (podKey: string, name: string) => void;
  setInput: <K extends keyof PodProfitInputs>(
    podKey: string,
    key: K,
    value: PodProfitInputs[K]
  ) => void;
  toggleExpanded: (podKey: string) => void;
}

const newKey = () => globalThis.crypto.randomUUID();

/**
 * One saved comparison, while it is being edited.
 *
 * The pods live here as INPUTS only; every figure the accordions and the totals
 * card show is derived on each render by the same `calculatePodProfit` the
 * single-pod tab runs, so there is one waterfall in the portal rather than two
 * that can disagree (rule 34).
 *
 * `podLabel` is the reader's word for "Pod" — the hook names a new row
 * "Pod 3" without owning a translator of its own.
 */
export function useMultiPodEditor(
  saved: SavedMultiPodCalculator,
  podLabel: string
): MultiPodEditor {
  const [name, setName] = useState(saved.name);
  const [entries, setEntries] = useState<MultiPodEntry[]>(() => entriesOfSaved(saved));
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(
    () => new Set(entries.slice(0, 1).map((entry) => entry.pod_key))
  );

  const addPod = useCallback(() => {
    const pod_key = newKey();
    setEntries((prev) => [
      ...prev,
      {
        pod_key,
        name: `${podLabel} ${prev.length + 1}`,
        // A new pod starts from the previous one's numbers: a comparison
        // almost always shares GST, platform fee and commission rates, and it
        // is the ticket, spots or venue price that differ.
        inputs: prev.at(-1)?.inputs ?? DEFAULT_INPUTS,
      },
    ]);
    setExpandedKeys((keys) => new Set(keys).add(pod_key));
  }, [podLabel]);

  const removePod = useCallback((podKey: string) => {
    setEntries((prev) => prev.filter((entry) => entry.pod_key !== podKey));
    setExpandedKeys((keys) => {
      const next = new Set(keys);
      next.delete(podKey);
      return next;
    });
  }, []);

  const renamePod = useCallback((podKey: string, podName: string) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.pod_key === podKey ? { ...entry, name: podName } : entry))
    );
  }, []);

  const setInput = useCallback(
    <K extends keyof PodProfitInputs>(podKey: string, key: K, value: PodProfitInputs[K]) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.pod_key === podKey ? { ...entry, inputs: { ...entry.inputs, [key]: value } } : entry
        )
      );
    },
    []
  );

  const toggleExpanded = useCallback((podKey: string) => {
    setExpandedKeys((keys) => {
      const next = new Set(keys);
      if (next.has(podKey)) {
        next.delete(podKey);
      } else {
        next.add(podKey);
      }
      return next;
    });
  }, []);

  const rows = useMemo(() => rowsOf(entries), [entries]);
  const totals = useMemo(() => sumMultiPods(rows), [rows]);

  // Re-derived from `saved` rather than latched: a successful save refetches
  // the row, the signature it produces then matches what is on screen, and the
  // editor goes clean on its own with no flag to keep in step.
  const savedSignature = useMemo(() => signatureOf(saved.name, entriesOfSaved(saved)), [saved]);
  const dirty = signatureOf(name, entries) !== savedSignature;

  return {
    name,
    rows,
    totals,
    expandedKeys,
    entries,
    dirty,
    setName,
    addPod,
    removePod,
    renamePod,
    setInput,
    toggleExpanded,
  };
}
