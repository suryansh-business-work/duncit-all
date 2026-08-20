import { useMemo, type ReactNode } from 'react';
import { ThemeProvider, createTheme, type Theme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { muiDateFormats, setAmbientDateSettings, usesTwelveHourClock } from '@duncit/datetime';
// Teaches `createTheme` about the picker components below.
import type {} from '@mui/x-date-pickers/themeAugmentation';

import { useDateFormat } from './useDateFormat';

/**
 * The ENTRY half of rule 11: every MUI X picker under this provider reads and
 * writes dates in the admin's configured pattern.
 *
 * Set once at each surface's root, it reaches every picker in the tree, so a
 * date field never has to remember to pass `format`. Before this existed the
 * adapter's own en-US default won by omission, which is how the signup
 * date-of-birth box asked for MM/DD/YYYY while the admin panel was set to
 * dd MMM yyyy and the native app to YYYY-MM-DD — three answers to one question.
 *
 * Nested `LocalizationProvider`s SHADOW this one. A picker that needs its own
 * adapter options must spread `useDateFormat`'s patterns itself; plain pickers
 * must not re-wrap.
 */
export interface DuncitLocalizationProviderProps {
  children: ReactNode;
  /**
   * Format in the admin-configured zone rather than the device's. mWeb renders
   * zone-aware so every viewer sees the same wall-clock time; the portals show
   * the operator's local zone.
   */
  timeZoneAware?: boolean;
}

export function DuncitLocalizationProvider({
  children,
  timeZoneAware = false,
}: Readonly<DuncitLocalizationProviderProps>) {
  const { dateFormat, timeFormat, timeZone } = useDateFormat({ timeZoneAware });

  // Published for the callers that produce date text OUTSIDE a component — AG
  // Grid value getters, pure helpers in utils modules. Writing during render
  // (rather than in an effect) keeps a table built in this same commit from
  // painting one frame of the fallback pattern; the setter ignores an
  // unchanged value, so repeat renders are inert.
  setAmbientDateSettings({ dateFormat, timeFormat, timeZone, timeZoneAware });

  const dateFormats = useMemo(
    () => muiDateFormats(dateFormat, timeFormat),
    [dateFormat, timeFormat],
  );

  // The clock face has to agree with the pattern the field shows: MUI picks
  // 12h/24h from `ampm`, which defaults to the ADAPTER's locale (en-US → 12h)
  // and would leave an admin on HH:mm typing 24h into a field the popup edits
  // in AM/PM. Applied as theme defaults so the two stay in step everywhere,
  // including the pickers nested inside shared packages.
  const ampm = usesTwelveHourClock(timeFormat);
  const withClockCycle = useMemo(
    () => (outer: Theme) =>
      createTheme(outer, {
        components: {
          MuiTimePicker: { defaultProps: { ampm } },
          MuiDesktopTimePicker: { defaultProps: { ampm } },
          MuiMobileTimePicker: { defaultProps: { ampm } },
          MuiDateTimePicker: { defaultProps: { ampm } },
          MuiDesktopDateTimePicker: { defaultProps: { ampm } },
          MuiMobileDateTimePicker: { defaultProps: { ampm } },
        },
      }),
    [ampm],
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} dateFormats={dateFormats}>
      <ThemeProvider theme={withClockCycle}>{children}</ThemeProvider>
    </LocalizationProvider>
  );
}
