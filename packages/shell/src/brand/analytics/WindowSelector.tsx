import type { MouseEvent } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import { BRAND_ANALYTICS_WINDOWS, type BrandAnalyticsWindow } from './queries';

interface WindowSelectorProps {
  value: BrandAnalyticsWindow;
  onChange: (value: BrandAnalyticsWindow) => void;
}

/** 7 / 30 / 90 days. Exclusive: pressing the active window again keeps it. */
export function WindowSelector({ value, onChange }: Readonly<WindowSelectorProps>) {
  const { t } = useTranslation();
  const handleChange = (_event: MouseEvent<HTMLElement>, next: BrandAnalyticsWindow | null) => {
    if (next !== null) onChange(next);
  };
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={handleChange}
      aria-label={t('shell.brandConsole.windowLabel')}
      data-testid="brand-analytics-window"
    >
      {BRAND_ANALYTICS_WINDOWS.map((days) => (
        <ToggleButton key={days} value={days} data-testid={`brand-analytics-window-${days}`}>
          {t('shell.brandConsole.windowDays', { vars: { days } })}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
