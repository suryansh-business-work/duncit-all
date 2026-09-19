import { useId } from 'react';
import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { AI_TRANSLATE_SCOPES, type AiTranslateScope } from './ai-translate.types';

/** Literal keys per scope, so the localization gate can see every one. */
const SCOPE_COPY: Readonly<Record<AiTranslateScope, { label: string; hint: string }>> = {
  OUTDATED: { label: 'localization.ai.scopeOutdated', hint: 'localization.ai.scopeOutdatedHint' },
  MISSING: { label: 'localization.ai.scopeMissing', hint: 'localization.ai.scopeMissingHint' },
  ALL: { label: 'localization.ai.scopeAll', hint: 'localization.ai.scopeAllHint' },
};

interface Props {
  value: AiTranslateScope;
  onChange: (scope: AiTranslateScope) => void;
}

const isScope = (value: string): value is AiTranslateScope =>
  AI_TRANSLATE_SCOPES.some((scope) => scope === value);

/**
 * What a run sends. The counts beside each language follow this choice, because
 * the options differ by thousands of keys and by real money — and only one of
 * them also throws away text somebody wrote by hand.
 */
export default function ScopeChoice({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const labelId = useId();

  return (
    <FormControl>
      <FormLabel id={labelId}>{t('localization.ai.scopeLabel')}</FormLabel>
      <RadioGroup
        aria-labelledby={labelId}
        value={value}
        onChange={(_, next) => {
          if (isScope(next)) onChange(next);
        }}
      >
        {AI_TRANSLATE_SCOPES.map((scope) => (
          <FormControlLabel
            key={scope}
            value={scope}
            control={<Radio />}
            data-testid={`ai-translate-scope-${scope.toLowerCase()}`}
            label={
              <>
                <Typography variant="body2">{t(SCOPE_COPY[scope].label)}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {t(SCOPE_COPY[scope].hint)}
                </Typography>
              </>
            }
            sx={{ alignItems: 'flex-start', mb: 1, '& .MuiRadio-root': { pt: 0.5 } }}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
