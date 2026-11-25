import { Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';

export interface DeclaredVar {
  key: string;
  description?: string | null;
}

interface Props {
  /** Variables to collect values for (declared on the template). */
  variables: DeclaredVar[];
  /** Current slug → value map. */
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  emptyHint?: string;
}

/**
 * Array-of-inputs editor for template variable sample/send values — one labelled
 * field per declared variable (replaces the old raw-JSON textarea).
 */
export default function VariablesValuesEditor({ variables, values, onChange, emptyHint }: Readonly<Props>) {
  const { t } = useTranslation();
  if (variables.length === 0) {
    return (
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {emptyHint ?? t('crm.emailTemplates.noVariablesDeclared')}
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {variables.map((v) => (
        <TextField
          key={v.key}
          size="small"
          label={v.key}
          placeholder={v.description ?? t('crm.emailTemplates.valueFor', { vars: { key: v.key } })}
          value={values[v.key] ?? ''}
          onChange={(e) => onChange({ ...values, [v.key]: e.target.value })}
          fullWidth
        />
      ))}
    </Stack>
  );
}
