import { Chip, Stack, Typography } from '@mui/material';
import { usePortalT } from '../../../../shared/i18n';
import { braced } from './email-template.types';

interface Props {
  vars: readonly string[];
  disabled: boolean;
  onInsert: (name: string) => void;
}

/** The placeholders a template may use, each a chip that drops `{name}` at the cursor. */
export function VarChips({ vars, disabled, onInsert }: Readonly<Props>) {
  const { t } = usePortalT();
  if (vars.length === 0) return null;
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('litePortal.emailTemplates.vars')} · {t('litePortal.emailTemplates.varsHint')}
      </Typography>
      <Stack direction="row" component="ul" sx={{ flexWrap: 'wrap', gap: 0.5, listStyle: 'none', m: 0, p: 0 }}>
        {vars.map((name) => (
          <li key={name}>
            <Chip
              size="small"
              variant="outlined"
              clickable
              disabled={disabled}
              label={braced(name)}
              onClick={() => onInsert(name)}
              aria-label={t('litePortal.emailTemplates.insertVar', { vars: { name: braced(name) } })}
              data-testid={`template-var-${name}`}
              sx={{ fontFamily: 'monospace' }}
            />
          </li>
        ))}
      </Stack>
    </Stack>
  );
}
