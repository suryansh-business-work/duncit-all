import { Stack, TextField, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { EmailTemplate } from '../../../api/emailTemplates.gql';

export interface DeclaredRow {
  v: EmailTemplate['variables'][number];
  index: number;
  key: number;
}

interface Props {
  declaredRows: DeclaredRow[];
  draft: EmailTemplate;
  setDraft: (t: EmailTemplate) => void;
}

/** In-place slug / description editors for the template's declared variables. */
export function DeclaredVariablesList({ declaredRows, draft, setDraft }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      {declaredRows.map(({ v, index, key }) => (
        <Stack key={key} direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <TextField
            size="small"
            value={v.key}
            onChange={(e) => {
              const copy = [...draft.variables];
              copy[index] = { ...copy[index], key: e.target.value };
              setDraft({ ...draft, variables: copy });
            }}
            sx={{ width: 160 }}
            slotProps={{ htmlInput: { 'aria-label': t('crm.emailTemplates.slug') } }}
          />
          <TextField
            size="small"
            slotProps={{ htmlInput: { 'aria-label': t('shell.common.description') } }}
            placeholder="description"
            value={v.description ?? ''}
            onChange={(e) => {
              const copy = [...draft.variables];
              copy[index] = { ...copy[index], description: e.target.value };
              setDraft({ ...draft, variables: copy });
            }}
            sx={{ flex: 1 }}
          />
          <Tooltip title={`Copy {{ ${v.key} }}`}>
            <DuncitIconButton size="small" onClick={() => navigator.clipboard?.writeText(`{{ ${v.key} }}`)}><ContentCopyIcon fontSize="small" /></DuncitIconButton>
          </Tooltip>
          <DuncitIconButton size="small" color="error" aria-label={t('shell.a11y.removeNamed', { vars: { name: v.key } })} data-testid="crm-template-variable-remove" onClick={() => setDraft({ ...draft, variables: draft.variables.filter((_, j) => j !== index) })}>
            <DeleteIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      ))}
    </Stack>
  );
}
