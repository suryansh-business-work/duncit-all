import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_INPUTS, type PodProfitInputs } from '../types';
import {
  entriesOfSaved,
  inputsOf,
  newEntry,
  podPayload,
  signatureOf,
  type PodEntry,
  type SavedPodCalculator,
} from '../saved/types';

export interface SingleCalculator {
  name: string;
  inputs: PodProfitInputs;
  /** True while the calculator holds anything the server has not been told about. */
  dirty: boolean;
  /** The one-pod payload a create or update mutation wants. */
  payload: ReturnType<typeof podPayload>;
  setName: (name: string) => void;
  setInput: <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) => void;
  reset: () => void;
}

/** The scratch calculator, before anything has been saved. */
const blankEntry = (podLabel: string): PodEntry => newEntry(podLabel, 1, DEFAULT_INPUTS);

/**
 * The single-pod tab's calculator.
 *
 * A saved SINGLE calculation is a comparison with exactly one pod in it, so it
 * reads and writes the same shape the multi tab does — the pod key survives a
 * save, which is what keeps the row's identity stable across an update.
 *
 * `saved` is null while the calculator is a scratch pad. The component keys
 * this hook on the open row's id, so loading a different one remounts rather
 * than syncing props into state.
 */
export function useSingleCalculator(
  saved: SavedPodCalculator | null,
  podLabel: string
): SingleCalculator {
  const seed = useMemo<PodEntry>(
    () => (saved ? (entriesOfSaved(saved)[0] ?? blankEntry(podLabel)) : blankEntry(podLabel)),
    [saved, podLabel]
  );

  const [name, setName] = useState(saved?.name ?? '');
  const [podKey] = useState(seed.pod_key);
  const [inputs, setInputs] = useState<PodProfitInputs>(seed.inputs);

  const setInput = useCallback(
    <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = useCallback(() => setInputs(DEFAULT_INPUTS), []);

  const entries = useMemo<PodEntry[]>(
    () => [{ pod_key: podKey, name: name.trim() || podLabel, inputs }],
    [podKey, name, inputs, podLabel]
  );

  // Re-derived from `saved` rather than latched: a successful save refetches the
  // row, the signature it produces then matches what is on screen, and the
  // calculator goes clean on its own with no flag to keep in step. An unsaved
  // scratch pad is always dirty — there is nothing on the server to match.
  const savedSignature = useMemo(
    () =>
      saved
        ? signatureOf(
            saved.name,
            saved.pods.map((pod) => ({
              pod_key: pod.pod_key,
              name: pod.name,
              inputs: inputsOf(pod),
            }))
          )
        : null,
    [saved]
  );
  const dirty = savedSignature === null || signatureOf(name, entries) !== savedSignature;

  return {
    name,
    inputs,
    dirty,
    payload: podPayload(entries),
    setName,
    setInput,
    reset,
  };
}
