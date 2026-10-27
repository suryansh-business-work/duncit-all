import { useSearchParams } from 'react-router';

/** The default window of every dashboard chart. */
const DEFAULT_MONTHS = 12;

/** A dashboard's period, kept in `?months=` so a shared link opens the same window. */
export function useMonthsParam(): [number, (months: number) => void] {
  const [params, setParams] = useSearchParams();
  const months = Number(params.get('months')) || DEFAULT_MONTHS;
  return [months, (next: number) => setParams({ months: String(next) })];
}
