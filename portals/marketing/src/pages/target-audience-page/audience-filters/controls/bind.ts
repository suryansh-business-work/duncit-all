import type { AudienceFilterState } from '../types';

export const SMALL = { size: 'small', fullWidth: true } as const;

/** A control bound to one key of the filter state. `bind()` builds these, so
 * every control is wired the same way and no section repeats a handler. */
export interface Bound<V> {
  value: V;
  onChange: (value: V) => void;
}

type Setter = <K extends keyof AudienceFilterState>(key: K, value: AudienceFilterState[K]) => void;

/** One binder per render; every control gets its handler from here rather than
 * declaring its own inline arrow. */
export const makeBind =
  (state: AudienceFilterState, set: Setter) =>
  <K extends keyof AudienceFilterState>(name: K): Bound<AudienceFilterState[K]> => ({
    value: state[name],
    onChange: (value) => set(name, value),
  });
