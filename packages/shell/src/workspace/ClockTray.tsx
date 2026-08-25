import { useMemo } from 'react';
import {
  Alert,
  Autocomplete,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { LanguageSelect } from '@duncit/ui';
import { useTranslation } from '../i18n/useTranslation';
import { useLocalePreference } from '../i18n/useLocalePreference';
import { describeZone, deviceTimeZone, zoneChoices, type ZoneChoice } from './clock';
import { useWorkspace } from './context';

/** The two entries that are not a zone name: follow the admin, follow the machine. */
const WORKSPACE_ZONE = '';

/**
 * What the taskbar clock opens: the date in full, which zone it is being read
 * in, whether to count seconds, and the language the console speaks.
 *
 * The zone list comes from the browser rather than a table in the repo — a
 * curated list of "common" zones is the kind of static data that is wrong for
 * whoever is not on it (rule 2 of the coding standards), and every engine that
 * can format a zone can also enumerate them. Each row is written the way every
 * other zone picker writes one — `(GMT+05:30) Asia/Calcutta · IST` — and the
 * list runs from the earliest offset to the latest, because "which of these is
 * my zone" is a question about the offset far more often than about the
 * spelling of the nearest city.
 */
export interface ClockTrayProps {
  /** The instant on screen, date and time together — the clock already has it. */
  full: string;
  /** The zone actually being rendered in, once 'follow the workspace' resolves. */
  zone: string;
}

export function ClockTray({ full, zone: active }: Readonly<ClockTrayProps>) {
  const { t } = useTranslation();
  const workspace = useWorkspace();
  const zone = workspace?.clockZone ?? WORKSPACE_ZONE;
  const seconds = workspace?.clockSeconds ?? false;
  const locale = useLocalePreference();

  const device = deviceTimeZone();
  const described = useMemo(() => {
    const zones = zoneChoices();
    // The device's own zone may not be in the enumerated list on every engine
    // — one that answers 'Asia/Calcutta' still resolves the machine to
    // 'Asia/Kolkata' — so it is described on its own and pinned to the top.
    if (!device || zones.some((choice) => choice.value === device)) return zones;
    return [describeZone(device), ...zones];
  }, [device]);

  const options = useMemo(() => {
    const rest = described.filter((choice) => choice.value !== device).map((choice) => choice.value);
    return [WORKSPACE_ZONE, ...(device ? [device] : []), ...rest];
  }, [described, device]);

  const labels = useMemo(() => {
    const row = (choice: ZoneChoice): string => `(${choice.gmt}) ${choice.value} · ${choice.name}`;
    return new Map(described.map((choice) => [choice.value, row(choice)]));
  }, [described]);

  const label = (value: string): string => {
    if (value === WORKSPACE_ZONE) {
      return t('shell.taskbar.workspaceZone', { vars: { zone: active } });
    }
    if (value === device) return t('shell.taskbar.deviceZone', { vars: { zone: device } });
    return labels.get(value) ?? value;
  };

  return (
    <Stack spacing={1.5} sx={{ p: 2, width: 320 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {full}
      </Typography>

      <Autocomplete
        size="small"
        disableClearable
        options={options}
        value={zone}
        getOptionLabel={label}
        onChange={(_event, next) => workspace?.setClockZone(next ?? WORKSPACE_ZONE)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('shell.taskbar.timeZone')}
            helperText={t('shell.taskbar.timeZoneHint')}
          />
        )}
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={seconds}
            onChange={(event) => workspace?.setClockSeconds(event.target.checked)}
          />
        }
        label={t('shell.taskbar.showSeconds')}
      />

      <Divider />

      {/* `showSingle`, unlike everywhere else this switcher appears: the tray is
          where a console's language LIVES, the way a desktop's clock tray is,
          and a platform that currently ships one language would otherwise open
          it to a divider with nothing under it. */}
      <LanguageSelect
        showSingle
        value={locale.locale}
        options={locale.locales}
        onChange={locale.change}
        label={t('mweb.common.language')}
      />
      {locale.saved && <Alert severity="success">{t('mweb.common.languageSaved')}</Alert>}
      {locale.error && <Alert severity="error">{locale.error}</Alert>}
    </Stack>
  );
}
