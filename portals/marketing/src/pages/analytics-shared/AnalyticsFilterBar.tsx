import { useId } from 'react';
import {
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { PLATFORMS, PLATFORM_LABEL } from '../social-accounts-page/copy';
import { labelOf } from './format';
import { PRESETS, type AnalyticsWindowState, type Preset } from './useAnalyticsWindow';

const DAY = 'yyyy-MM-dd';

const PRESET_LABEL: Record<Preset, string> = {
  7: 'marketing.social.period7',
  30: 'marketing.social.period30',
  90: 'marketing.social.period90',
};

interface Props {
  range: AnalyticsWindowState;
  /** Off on a page whose figures have no network. */
  showPlatforms?: boolean;
}

/** One row above every analytics page: how long, from when to when, and which networks. Empty networks = all. */
export default function AnalyticsFilterBar({ range, showPlatforms = true }: Readonly<Props>) {
  const { t } = useTranslation();
  const labelId = useId();
  const { input, preset } = range;
  const pick = (which: 'from' | 'to') => (date: Date | null) => {
    if (!date || !isValid(date)) return;
    const next = { ...input, [which]: format(date, DAY) };
    // A start after the end moves the end along with it, rather than refusing.
    if (next.from > next.to) next[which === 'from' ? 'to' : 'from'] = next[which];
    range.chooseRange(next.from, next.to);
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }} data-testid="analytics-filters">
      <ToggleButtonGroup
        exclusive
        size="small"
        value={preset}
        onChange={(_event, next: Preset | null) => {
          if (next) range.choosePreset(next);
        }}
        aria-label={t('marketing.social.period')}
        data-testid="analytics-preset"
      >
        {PRESETS.map((days) => (
          <ToggleButton key={days} value={days}>
            {t(PRESET_LABEL[days])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <DatePicker label={t('marketing.analytics.from')} value={parseISO(input.from)} onChange={pick('from')} slotProps={{ textField: { size: 'small' } }} />
      <DatePicker label={t('marketing.analytics.to')} value={parseISO(input.to)} onChange={pick('to')} slotProps={{ textField: { size: 'small' } }} />
      {showPlatforms && (
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id={labelId} shrink>
            {t('marketing.analytics.networks')}
          </InputLabel>
          <Select
            multiple
            displayEmpty
            labelId={labelId}
            input={<OutlinedInput notched label={t('marketing.analytics.networks')} />}
            value={input.platforms}
            onChange={(event) => {
              const { value } = event.target;
              range.choosePlatforms(String(value).split(',').filter(Boolean));
            }}
            renderValue={(selected) =>
              selected.length === 0
                ? t('marketing.analytics.allNetworks')
                : selected.map((code) => labelOf(PLATFORM_LABEL, code, t)).join(', ')
            }
            data-testid="analytics-networks"
          >
            {PLATFORMS.map((platform) => (
              <MenuItem key={platform} value={platform}>
                <Checkbox size="small" checked={input.platforms.includes(platform)} />
                <ListItemText primary={t(PLATFORM_LABEL[platform])} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Stack>
  );
}
