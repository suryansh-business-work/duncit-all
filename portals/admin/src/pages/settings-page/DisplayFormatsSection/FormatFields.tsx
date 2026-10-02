import { MenuItem, Stack, TextField } from '@mui/material';
import { format } from 'date-fns';
import { useTranslation } from '@duncit/shell';
import { DATE_PRESETS, TIME_PRESETS } from './constants';

interface Props {
  dateFmt: string;
  timeFmt: string;
  setDateFmt: (value: string) => void;
  setTimeFmt: (value: string) => void;
}

/** Preset pickers plus the raw date and time patterns they fill in. */
export default function FormatFields({ dateFmt, timeFmt, setDateFmt, setTimeFmt }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label={t('admin.settings.dateFormat')}
          value={DATE_PRESETS.includes(dateFmt) ? dateFmt : '__custom__'}
          onChange={(e) =>
            setDateFmt(e.target.value === '__custom__' ? dateFmt : e.target.value)
          }
          fullWidth
        >
          {DATE_PRESETS.map((p) => (
            <MenuItem key={p} value={p}>
              {p} — {(() => { try { return format(new Date(), p); } catch { return ''; } })()}
            </MenuItem>
          ))}
          <MenuItem value="__custom__">{t('admin.settings.customPattern')}</MenuItem>
        </TextField>
        <TextField
          select
          label={t('admin.settings.timeFormat')}
          value={TIME_PRESETS.includes(timeFmt) ? timeFmt : '__custom__'}
          onChange={(e) =>
            setTimeFmt(e.target.value === '__custom__' ? timeFmt : e.target.value)
          }
          fullWidth
        >
          {TIME_PRESETS.map((p) => (
            <MenuItem key={p} value={p}>
              {p} — {(() => { try { return format(new Date(), p); } catch { return ''; } })()}
            </MenuItem>
          ))}
          <MenuItem value="__custom__">{t('admin.settings.customPattern')}</MenuItem>
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('admin.settings.datePattern')}
          value={dateFmt}
          onChange={(e) => setDateFmt(e.target.value)}
          fullWidth
          helperText={t('admin.settings.datePatternHint')}
        />
        <TextField
          label={t('admin.settings.timePattern')}
          value={timeFmt}
          onChange={(e) => setTimeFmt(e.target.value)}
          fullWidth
          helperText={t('admin.settings.timePatternHint')}
        />
      </Stack>
    </>
  );
}
