import { Stack } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import PeriodControls from './PeriodControls';
import { CitySelect, CompareSelect } from './FilterSelects';
import type { PeriodState } from './period-state';

interface Props {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
  /** A page that reads only the state of things now has no period to choose. */
  periodless?: boolean;
  /** Pages whose every number has a place can be narrowed to one city. */
  cityFilter?: boolean;
  /** The console this page's numbers come from. */
  detailsUrl?: string | null;
}

/** A dashboard's header controls: the period, the comparison, the city, and the jump to the console behind it. */
export default function PageControls({ value, onChange, periodless, cityFilter, detailsUrl }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} sx={{ alignItems: { lg: 'center' }, flexWrap: 'wrap' }}>
      {!periodless && <PeriodControls value={value} onChange={onChange} />}
      {!periodless && <CompareSelect value={value.compare} onChange={(compare) => onChange({ ...value, compare })} />}
      {cityFilter && <CitySelect value={value.city} onChange={(city) => onChange({ ...value, city })} />}
      {detailsUrl && (
        <DuncitButton
          size="small"
          variant="outlined"
          href={detailsUrl}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewIcon fontSize="small" />}
          aria-label={t('analytics.page.moreDetails')}
          data-testid="analytics-page-details"
        >
          {t('analytics.page.moreDetailsShort')}
        </DuncitButton>
      )}
    </Stack>
  );
}
