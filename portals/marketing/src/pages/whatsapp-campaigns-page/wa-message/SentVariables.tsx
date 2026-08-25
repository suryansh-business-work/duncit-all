import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { paramContext } from '../wa-aisensy/helpers';

/** One value, its placeholder, and what that placeholder was for. Hoisted so it
 * isn't redefined each render (S6478). */
function VariableRow({
  position,
  value,
  meaning,
  blankLabel,
}: Readonly<{ position: number; value: string; meaning: string; blankLabel: string }>) {
  const filled = value.trim().length > 0;
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Chip
        size="small"
        label={`{{${position}}}`}
        sx={{ fontFamily: 'monospace', minWidth: 56 }}
      />
      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={filled ? 700 : 400}
          color={filled ? 'text.primary' : 'text.secondary'}
          sx={{ wordBreak: 'break-word', fontStyle: filled ? 'normal' : 'italic' }}
        >
          {filled ? value : blankLabel}
        </Typography>
        {meaning && (
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            {meaning}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

interface Props {
  /** What filled {{1}}, {{2}}… in order, frozen at send time. */
  params: string[];
  /** What each placeholder is FOR, from the scenario registry. A campaign send
   * has no registry entry, so its rows fall back to the template's own words. */
  labels?: readonly string[];
  /** The template body, for that fallback. Empty when AiSensy could not be read. */
  body: string;
}

/**
 * The values behind the message, one row each.
 *
 * The bubble above shows the sentence they made; this shows them as data, which
 * is what a support question is actually about — "it said the wrong time" is
 * answered by seeing the exact string that went into `{{3}}`, including a blank
 * one, which the bubble cannot show at all because a blank falls back to its
 * placeholder there.
 */
export default function SentVariables({ params, labels, body }: Readonly<Props>) {
  const { t } = useTranslation();

  if (params.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('marketingWhatsapp.logs.variablesNone')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {params.map((value, index) => (
        // Values are ordered and may repeat, so the position is the only stable
        // identity a row has (S6479).
        <VariableRow
          key={`${index}-${value}`}
          position={index + 1}
          value={value}
          meaning={labels?.[index] ?? paramContext(body, index + 1)}
          blankLabel={t('marketingWhatsapp.logs.variableBlank')}
        />
      ))}
    </Stack>
  );
}
