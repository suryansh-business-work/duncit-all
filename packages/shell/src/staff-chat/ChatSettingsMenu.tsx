import { useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  ListSubheader,
  MenuItem,
  Popover,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from '../i18n/useTranslation';
import type { ChatSettings } from './useChatSettings';

/** A short list beats a 400-entry dropdown for a team in a few places. */
const ZONES = [
  { value: '', label: 'This device' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Singapore', label: 'Singapore' },
];

const COLORS: Array<{ value: ChatSettings['bubbleColor']; label: string }> = [
  { value: 'primary', label: 'Brand' },
  { value: 'secondary', label: 'Violet' },
  { value: 'success', label: 'Green' },
  { value: 'info', label: 'Blue' },
];

interface Props {
  settings: ChatSettings;
  onChange: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
}

/** Row label + control, so the five settings line up without a table. */
function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
      <Typography variant="body2">{label}</Typography>
      {children}
    </Stack>
  );
}

/**
 * How this chat looks, for this person on this device.
 *
 * Everything here is a preference with an obvious default, so it hides behind
 * one icon rather than taking space from the conversation.
 */
export default function ChatSettingsMenu({ settings, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={t('shell.chat.settings.title')}>
        <IconButton size="small" aria-label={t('shell.chat.settings.title')} onClick={(e) => setAnchor(e.currentTarget)}>
          <TuneIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack spacing={1.5} sx={{ p: 2, width: 290 }}>
          <ListSubheader disableGutters sx={{ lineHeight: 1.6, bgcolor: 'transparent' }}>
            Chat settings
          </ListSubheader>

          <Row label={t('shell.chat.settings.view')}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={settings.density}
              onChange={(_e, value) => value && onChange('density', value)}
            >
              <ToggleButton value="COMFORTABLE" aria-label={t('shell.chat.settings.comfortable')}>
                Comfortable
              </ToggleButton>
              <ToggleButton value="COMPACT" aria-label={t('shell.chat.settings.compact')}>
                Compact
              </ToggleButton>
            </ToggleButtonGroup>
          </Row>

          <Divider />

          <Row label={t('shell.chat.settings.bubbles')}>
            <Stack direction="row" spacing={0.5}>
              {COLORS.map((color) => (
                <Box
                  key={color.value}
                  component="button"
                  type="button"
                  aria-label={color.label}
                  aria-pressed={settings.bubbleColor === color.value}
                  onClick={() => onChange('bubbleColor', color.value)}
                  sx={{
                    width: 22,
                    height: 22,
                    p: 0,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    bgcolor: `${color.value}.main`,
                    border: 2,
                    borderColor: settings.bubbleColor === color.value ? 'text.primary' : 'transparent',
                  }}
                />
              ))}
            </Stack>
          </Row>

          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Text size
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
              inputProps={{ 'aria-label': 'Timezone' }}
            >
              {ZONES.map((zone) => (
                <MenuItem key={zone.value || 'device'} value={zone.value}>
                  {zone.label}
                </MenuItem>
              ))}
            </TextField>
          </Row>

          <Row label={t('shell.chat.settings.enterSends')}>
            <Switch
              size="small"
              checked={settings.enterToSend}
              onChange={(event) => onChange('enterToSend', event.target.checked)}
              inputProps={{ 'aria-label': 'Enter sends the message' }}
            />
          </Row>
          <Typography variant="caption" color="text.secondary">
            {settings.enterToSend
              ? 'Shift+Enter starts a new line.'
              : 'Ctrl+Enter sends; Enter starts a new line.'}
          </Typography>
        </Stack>
      </Popover>
    </>
  );
}
