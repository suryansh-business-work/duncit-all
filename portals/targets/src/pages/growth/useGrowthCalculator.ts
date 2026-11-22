import { useCallback, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  DEFAULT_GROWTH_INPUTS,
  computeGrowth,
  type GrowthInputs,
  type GrowthOutputs,
} from '../../lib/growth-calculator';
import type { SavedCalculation } from '../../lib/queries';

export interface GrowthCalculatorState {
  /** The plan the assumptions form shows; replaced to load another one. */
  seed: GrowthInputs;
  /** The current assumptions, or null while any is invalid. */
  inputs: GrowthInputs | null;
  /** The results of the last valid plan — they hold still while a box is being fixed. */
  outputs: GrowthOutputs;
  stale: boolean;
  editing: SavedCalculation | null;
  viewing: SavedCalculation | null;
  refetchRef: MutableRefObject<(() => void) | null>;
  onInputs: (inputs: GrowthInputs | null) => void;
  resetInputs: () => void;
  startEdit: (row: SavedCalculation) => void;
  cancelEdit: () => void;
  setViewing: (row: SavedCalculation | null) => void;
  onSaved: () => void;
}

/** A fresh copy of a plan, so loading it always counts as a change. */
const copyOf = (inputs: GrowthInputs): GrowthInputs => ({ ...inputs });

/** The Growth Calculator page's state: the plan, its results, and which saved record is open. */
export function useGrowthCalculator(): GrowthCalculatorState {
  const [seed, setSeed] = useState<GrowthInputs>(() => copyOf(DEFAULT_GROWTH_INPUTS));
  const [inputs, setInputs] = useState<GrowthInputs | null>(seed);
  const [lastValid, setLastValid] = useState<GrowthInputs>(seed);
  const [editing, setEditing] = useState<SavedCalculation | null>(null);
  const [viewing, setViewing] = useState<SavedCalculation | null>(null);
  const refetchRef = useRef<(() => void) | null>(null);

  const outputs = useMemo(() => computeGrowth(lastValid), [lastValid]);

  const onInputs = useCallback((next: GrowthInputs | null) => {
    setInputs(next);
    if (next) setLastValid(next);
  }, []);

  const resetInputs = useCallback(() => setSeed(copyOf(DEFAULT_GROWTH_INPUTS)), []);

  const startEdit = useCallback((row: SavedCalculation) => {
    setEditing(row);
    setSeed(copyOf(row.inputs));
  }, []);

  const cancelEdit = useCallback(() => setEditing(null), []);

  const onSaved = useCallback(() => {
    refetchRef.current?.();
    setEditing(null);
  }, []);

  return {
    seed,
    inputs,
    outputs,
    stale: inputs === null,
    editing,
    viewing,
    refetchRef,
    onInputs,
    resetInputs,
    startEdit,
    cancelEdit,
    setViewing,
    onSaved,
  };
}
