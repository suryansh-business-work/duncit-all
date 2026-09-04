import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  replaceExisting: boolean;
  onChange: (replaceExisting: boolean) => void;
  /** Keys the current choice would send, or null while it is being counted. */
  pending: number | null;
}

/**
 * What a run sends: the gaps, or everything.
 *
 * The count is quoted against the choice rather than the language, because the
 * two answers differ by thousands of keys and by real money — the whole
 * catalogue goes through OpenAI either way, and only one of the two options
 * also throws away text somebody wrote by hand.
 */
export default function AutoTranslateScope({
  replaceExisting,
  onChange,
  pending,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const nothingToSend = pending === 0;

  return (
    <FormControl>
      <FormLabel id="auto-translate-scope">{t('admin.localization.scopeLabel')}</FormLabel>
      <RadioGroup
        aria-labelledby="auto-translate-scope"
        value={replaceExisting ? 'all' : 'missing'}
        onChange={(_, value) => onChange(value === 'all')}
      >
        <FormControlLabel
          value="missing"
          control={<Radio />}
          label={t('admin.localization.scopeMissing')}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 4, mb: 1 }}>
          {t('admin.localization.scopeMissingHint')}
        </Typography>
        <FormControlLabel
          value="all"
          control={<Radio />}
          label={t('admin.localization.scopeAll')}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 4 }}>
          {t('admin.localization.scopeAllHint')}
        </Typography>
      </RadioGroup>
      <Stack sx={{ mt: 2 }}>
        {pending !== null && (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {nothingToSend
              ? t('admin.localization.nothingToSend')
              : t('admin.localization.willSend', { vars: { keys: pending } })}
          </Typography>
        )}
      </Stack>
    </FormControl>
  );
}
