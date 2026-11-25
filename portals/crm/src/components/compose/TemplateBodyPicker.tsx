import type { CrmLeadEntityType } from '../../api/crm.types';
import { useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { RENDER, TEMPLATES, type EmailAsset, type EmailTemplate } from '../../api/emailTemplates.gql';
import {
  crmInterpolateTemplate,
  crmSeedTemplateValue,
  crmStripPlaceholders,
  crmTemplatePlaceholders,
  crmTemplatesFor,
  parseApiError,
} from '@duncit/utils';
import VariablesValuesEditor from '../email/VariablesValuesEditor';
import { useTranslation } from '@duncit/shell';

export interface TemplateBody {
  subject: string;
  html: string;
  ready: boolean;
  attachments: EmailAsset[];
}

interface Props {
  entity: CrmLeadEntityType;
  /** Slug → value map pulled from the lead (venue/host), used to auto-fill. */
  variableValues: Record<string, string>;
  leadName: string;
  leadEmail: string;
  onChange: (body: TemplateBody) => void;
}

/** Template send mode: pick a template, auto-fill EVERY placeholder from the lead, render. */
export default function TemplateBodyPicker({ entity, variableValues, leadName, leadEmail, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { data, loading } = useQuery<{ emailTemplates: EmailTemplate[] }>(TEMPLATES, { fetchPolicy: 'cache-and-network' });
  // Creator / community leads have no template target of their own yet: they get the static templates.
  const templates = useMemo(() => crmTemplatesFor(data?.emailTemplates ?? [], entity), [data, entity]);

  const [selectedId, setSelectedId] = useState('');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<string[]>([]);
  const [html, setHtml] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const selected = templates.find((t) => t.template_id === selectedId) ?? null;

  const onPick = (id: string) => {
    setSelectedId(id);
    // The menu only offers ids from this same list, so a pick always resolves.
    const tpl = templates.find((t) => t.template_id === id)!;
    // Cover EVERY placeholder in the MJML + subject — not just declared ones —
    // so a {{ venue_name }} the author forgot to "declare" still binds.
    const allKeys = [...new Set([...crmTemplatePlaceholders(tpl.mjml), ...crmTemplatePlaceholders(tpl.subject)])];
    const sampleOf = new Map(tpl.variables.map((v) => [v.key, v.sample]));
    setKeys(allKeys);
    setVars(Object.fromEntries(allKeys.map((k) => [k, crmSeedTemplateValue(k, sampleOf.get(k), variableValues, leadName, leadEmail)])));
  };

  useEffect(() => {
    if (!selected) { onChange({ subject: '', html: '', ready: false, attachments: [] }); return; }
    const attachments = selected.attachments;
    const id = setTimeout(async () => {
      // Merge lead values under the edited values so every matching slug binds.
      const merged = { ...variableValues, ...vars };
      try {
        const res = await client.query<any>({ query: RENDER, variables: { mjml: selected.mjml, vars: JSON.stringify(merged) }, fetchPolicy: 'network-only' });
        const renderedHtml = crmStripPlaceholders(res.data?.renderEmailTemplate?.html);
        setHtml(renderedHtml);
        setErrors(res.data?.renderEmailTemplate?.errors);
        onChange({ subject: crmInterpolateTemplate(selected.subject, merged), html: renderedHtml, ready: !!renderedHtml, attachments });
      } catch (e) {
        setErrors([parseApiError(e)]);
        onChange({ subject: crmInterpolateTemplate(selected.subject, merged), html: '', ready: false, attachments });
      }
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, vars]);

  const editorVars = useMemo(() => keys.map((k) => ({ key: k })), [keys]);

  const pickHint = templates.length ? t('crm.compose.pickTemplate') : t('crm.compose.noTemplates');
  const helperText = loading ? t('crm.compose.loadingTemplates') : pickHint;

  return (
    <Stack spacing={1.5}>
      <TextField
        select
        size="small"
        label={t('crm.components.template')}
        value={selectedId}
        onChange={(e) => onPick(e.target.value)}
        helperText={helperText}
        fullWidth
      >
        {templates.map((t) => <MenuItem key={t.template_id} value={t.template_id}>{t.name}</MenuItem>)}
      </TextField>

      {selected && (
        <>
          {keys.length > 0 && (
            <>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>{t('crm.components.variableValuesAutoFilledFromThis')}</Typography>
              <VariablesValuesEditor variables={editorVars} values={vars} onChange={setVars} />
            </>
          )}
          {selected.attachments.length > 0 && (
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>{t('crm.compose.attachments', { count: selected.attachments.length })}</Typography>
          )}
          {errors.length > 0 && <Alert severity="warning">{errors.slice(0, 2).join(' · ')}</Alert>}
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>{t('crm.common.preview')}</Typography>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', height: 220, bgcolor: 'background.default' }}>
            <iframe title="template-preview" srcDoc={html} sandbox="" style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} />
          </Box>
        </>
      )}
    </Stack>
  );
}
