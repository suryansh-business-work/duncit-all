import {
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { localeName, type LocaleRow } from '../../lib/queries';

interface PendingCountProps {
  /** Undefined while the count is on its way. */
  keys: number | undefined;
}

/** How many keys this language would get — nothing until the server has counted. */
function PendingCount({ keys }: Readonly<PendingCountProps>) {
  const { t } = useTranslation();
  if (keys === undefined) return null;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={keys > 0 ? 'primary' : 'default'}
      label={t('localization.ai.keys', { count: keys })}
    />
  );
}

const toggle = (picked: readonly string[], code: string, on: boolean): string[] =>
  on ? [...picked, code] : picked.filter((item) => item !== code);

interface Props {
  targets: readonly LocaleRow[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** locale code -> keys the chosen scope would send. */
  pending: ReadonlyMap<string, number>;
  error?: string;
}

/** The languages a run covers, each with what it would cost in keys. */
export default function LanguageChecklist({ targets, value, onChange, pending, error }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <FormControl component="fieldset" variant="standard" error={!!error}>
      <FormLabel component="legend">{t('localization.ai.languages')}</FormLabel>
      <FormGroup>
        {targets.map((locale) => (
          <FormControlLabel
            key={locale.code}
            data-testid={`ai-translate-language-${locale.code}`}
            control={
              <Checkbox
                checked={value.includes(locale.code)}
                onChange={(_, on) => onChange(toggle(value, locale.code, on))}
              />
            }
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" component="span">
                  {localeName(locale)}
                </Typography>
                <PendingCount keys={pending.get(locale.code)} />
              </Stack>
            }
          />
        ))}
      </FormGroup>
      <FormHelperText>{error ?? t('localization.ai.languagesHint')}</FormHelperText>
    </FormControl>
  );
}
