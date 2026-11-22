import { Alert, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { alertText, suggestionText } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { Bootstrap } from './queries';

interface BubblesProps {
  suggestions: Bootstrap['suggestions'];
  disabled: boolean;
  onPick: (text: string) => void;
}

/** "What can I do?", "Check my account health"… — server-chosen for this role and page. */
export function SuggestionBubbles({ suggestions, disabled, onPick }: Readonly<BubblesProps>) {
  const { t } = useTranslation();
  if (!suggestions.length) return null;
  return (
    <Stack direction="row" useFlexGap role="list" aria-label={t('askDuncit.suggestionsLabel')} sx={{ flexWrap: 'wrap', gap: 1, px: 1.5, pb: 1 }}>
      {suggestions.map((s) => {
        const text = suggestionText(s, t);
        return (
          <Chip key={s.id} role="listitem" data-testid={`ask-duncit-suggestion-${s.id}`} label={text} variant="outlined" color="primary" disabled={disabled} onClick={() => onPick(text)} />
        );
      })}
    </Stack>
  );
}

interface AlertsProps {
  alerts: Bootstrap['alerts'];
  onAsk: (text: string) => void;
}

const SEVERITY = { CRITICAL: 'error', WARN: 'warning', INFO: 'info' } as const;

/** Proactive alerts above the conversation, each with a follow-up question. */
export function AlertsBar({ alerts, onAsk }: Readonly<AlertsProps>) {
  const { t } = useTranslation();
  if (!alerts.length) return null;
  return (
    <Stack spacing={0.75} sx={{ px: 1.5, pt: 1 }}>
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          severity={SEVERITY[alert.severity as keyof typeof SEVERITY] ?? 'info'}
          action={
            <DuncitButton size="small" color="inherit" onClick={() => onAsk(t(alert.prompt_key))}>
              {t('askDuncit.alerts.ask')}
            </DuncitButton>
          }
        >
          {alertText(alert, t)}
        </Alert>
      ))}
    </Stack>
  );
}

/** The empty conversation: a greeting that says what the assistant is for. */
export function EmptyState() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', py: 6, px: 2 }}>
      <Typography variant="h6" component="p" sx={{ fontWeight: 700 }}>
        {t('askDuncit.empty.title')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420 }}>
        {t('askDuncit.empty.body')}
      </Typography>
    </Stack>
  );
}
