import { Chip, CircularProgress, Stack, Switch, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation, whatsappCategoryCopy } from '@duncit/app-settings';
import type { WhatsAppPreferenceCategory } from './queries';

interface Props {
  item: WhatsAppPreferenceCategory;
  busy: boolean;
  /** No sendable number on the account, so every switch is read-only. */
  unreachable: boolean;
  onChange: (category: string, enabled: boolean) => void;
}

/**
 * One kind of WhatsApp message, with its switch.
 *
 * A required category is shown and locked rather than hidden. "Will I still be
 * told my pod was cancelled if I switch this off?" is the question people
 * actually have, and a screen that only lists what you can switch off never
 * answers it.
 */
export default function WhatsAppPreferenceRow({
  item,
  busy,
  unreachable,
  onChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = whatsappCategoryCopy(t, item.category);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      data-testid={`whatsapp-preference-${item.category}`}
      sx={{
        alignItems: "flex-start",
        py: 1.25
      }}>
      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{
          alignItems: "center"
        }}>
          <Typography variant="subtitle2" sx={{
            fontWeight: 700
          }}>
            {copy.label}
          </Typography>
          {item.required && (
            <Chip
              size="small"
              variant="outlined"
              icon={<LockOutlinedIcon fontSize="small" />}
              label={t('whatsappPreference.alwaysOn')}
            />
          )}
        </Stack>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {copy.description}
        </Typography>
      </Stack>

      {busy ? (
        <CircularProgress size={20} sx={{ m: 1 }} />
      ) : (
        <Switch
          checked={item.enabled}
          disabled={item.required || unreachable}
          onChange={(event) => onChange(item.category, event.target.checked)}
          slotProps={{
            input: { 'aria-label': copy.label }
          }}
        />
      )}
    </Stack>
  );
}
