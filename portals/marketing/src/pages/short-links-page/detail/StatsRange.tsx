import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Days a stats read covers. 0 is all time — the link's own lifetime total. */
const RANGES = [
  { value: 0, key: 'marketing.shortLinks.rangeAllTime' },
  { value: 7, key: 'marketing.shortLinks.rangeLast7Days' },
  { value: 30, key: 'marketing.shortLinks.rangeLast30Days' },
  { value: 90, key: 'marketing.shortLinks.rangeLast90Days' },
];

export const statsRangeOptions = (t: Translate) =>
  RANGES.map((range) => ({ value: range.value, label: t(range.key) }));

interface Props {
  days: number;
  onChange: (days: number) => void;
}

/**
 * The window every number on the page is read over.
 *
 * All time is the default on purpose: it is what the link's own click counter
 * says, so the page a marketer opens agrees with the row they clicked.
 */
export default function StatsRange({ days, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <TextField
      select
      size="small"
      label={t('marketing.shortLinks.period')}
      value={days}
      onChange={(event) => onChange(Number(event.target.value))}
      sx={{ minWidth: 160 }}
      data-testid="short-link-stats-range"
    >
      {statsRangeOptions(t).map((range) => (
        <MenuItem key={range.value} value={range.value}>
          {range.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
