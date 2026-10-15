import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { DEFAULT_FEATURE_RANGE, FEATURE_RANGE_DAYS } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Every key written out once, so the translation gate can see it. */
const rangeLabel = (t: Translate, days: number): string => {
  if (days === 1) return t('ai.features.range1');
  if (days === 7) return t('ai.features.range7');
  if (days === 90) return t('ai.features.range90');
  return t('ai.features.range30');
};

/**
 * The range lives in the URL (`?days=`), so the list and a feature's own page
 * show the same window and a shared link opens on it.
 */
export function useRangeParam(): [number, (days: number) => void] {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get('days'));
  const days = (FEATURE_RANGE_DAYS as readonly number[]).includes(raw) ? raw : DEFAULT_FEATURE_RANGE;
  const setDays = useCallback(
    (next: number) =>
      setParams(
        (prev) => {
          const copy = new URLSearchParams(prev);
          copy.set('days', String(next));
          return copy;
        },
        { replace: true }
      ),
    [setParams]
  );
  return [days, setDays];
}

export default function RangeSelect({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (days: number) => void }>) {
  const { t } = useTranslation();
  return (
    <TextField
      select
      size="small"
      label={t('ai.dashboard.range')}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      sx={{ minWidth: 160 }}
    >
      {FEATURE_RANGE_DAYS.map((days) => (
        <MenuItem key={days} value={days}>
          {rangeLabel(t, days)}
        </MenuItem>
      ))}
    </TextField>
  );
}
