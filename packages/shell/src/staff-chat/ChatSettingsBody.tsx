import {
  Box,
  Divider,
  ListSubheader,
  MenuItem,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import type { ChatSettings } from './useChatSettings';

/** The palettes a person can pick for their own bubbles. */
const COLORS = [
  { value: 'primary' as const, key: 'shell.chat.settings.colourPrimary' },
  { value: 'secondary' as const, key: 'shell.chat.settings.colourSecondary' },
  { value: 'success' as const, key: 'shell.chat.settings.colourSuccess' },
  { value: 'info' as const, key: 'shell.chat.settings.colourInfo' },
];

/**
 * The zones worth offering.
 *
 * '' means this machine's, which is right for almost everyone; the rest are
 * where the team actually is, so a timestamp can be read in a colleague's
 * working day rather than translated in your head.
 */
const ZONES = [
  { value: '', key: 'shell.chat.settings.zoneDevice' },
  { value: 'Asia/Kolkata', key: 'shell.chat.settings.zoneIndia' },
  { value: 'UTC', key: 'shell.chat.settings.zoneUtc' },
  { value: 'Europe/London', key: 'shell.chat.settings.zoneLondon' },
  { value: 'America/New_York', key: 'shell.chat.settings.zoneNewYork' },
];

/** Row label + control, so the settings line up without a table. */
function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: "center",
        justifyContent: "space-between"
      }}>
      <Typography variant="body2">{label}</Typography>
      {children}
    </Stack>
  );
}

interface Props {
  settings: ChatSettings;
  onChange: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
}

/** How this chat looks. Every one of these has an obvious default. */
export default function ChatSettingsBody({ settings, onChange }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1.5} sx={{ p: 2, width: 290 }}>
      <ListSubheader disableGutters sx={{ lineHeight: 1.6, bgcolor: 'transparent' }}>
        {t('shell.chat.settings.title')}
      </ListSubheader>

      <Row label={t('shell.chat.settings.view')}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={settings.density}
          onChange={(_e, value) => value && onChange('density', value)}
        >
          <ToggleButton value="COMFORTABLE" aria-label={t('shell.chat.settings.comfortable')}>
            {t('shell.chat.settings.comfortable')}
          </ToggleButton>
          <ToggleButton value="COMPACT" aria-label={t('shell.chat.settings.compact')}>
            {t('shell.chat.settings.compact')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Row>

      <Divider />

      <Row label={t('shell.chat.settings.bubbles')}>
        <Stack direction="row" spacing={0.5}>
          {COLORS.map((colour) => (
            <Box
              key={colour.value}
              component="button"
              type="button"
              aria-label={t(colour.key)}
              aria-pressed={settings.bubbleColor === colour.value}
              onClick={() => onChange('bubbleColor', colour.value)}
              sx={{
                width: 22,
                height: 22,
                p: 0,
                borderRadius: '50%',
                cursor: 'pointer',
                bgcolor: `${colour.value}.main`,
                border: 2,
                borderColor:
                  settings.bubbleColor === colour.value ? 'text.primary' : 'transparent',
              }}
            />
          ))}
        </Stack>
      </Row>

      <Box>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {t('shell.chat.settings.textSize')}
        </Typography>
        <Slider
          size="small"
          min={12}
          max={20}
          step={1}
          marks
          valueLabelDisplay="auto"
          value={settings.fontSize}
          onChange={(_e, value) => onChange('fontSize', value as number)}
          aria-label={t('shell.chat.settings.textSize')}
        />
      </Box>

      <Divider />

      <Row label={t('shell.chat.settings.timesIn')}>
        <TextField
          select
          size="small"
          value={settings.timeZone}
          onChange={(event) => onChange('timeZone', event.target.value)}
          sx={{ minWidth: 132 }}
          slotProps={{
            htmlInput: { 'aria-label': t('shell.chat.settings.timesIn') }
          }}
        >
          {ZONES.map((zone) => (
            <MenuItem key={zone.value || 'device'} value={zone.value}>
              {t(zone.key)}
            </MenuItem>
          ))}
        </TextField>
      </Row>

      <Row label={t('shell.chat.settings.enterSends')}>
        <Switch
          size="small"
          checked={settings.enterToSend}
          onChange={(event) => onChange('enterToSend', event.target.checked)}
          slotProps={{
            input: { 'aria-label': t('shell.chat.settings.enterSends') }
          }}
        />
      </Row>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t(
          settings.enterToSend
            ? 'shell.chat.settings.enterHint'
            : 'shell.chat.settings.ctrlEnterHint'
        )}
      </Typography>
    </Stack>
  );
}
