import { useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { RENDER, TEMPLATES, type EmailAsset, type EmailTemplate } from '../../api/emailTemplates.gql';
import { parseApiError } from '../../utils/parseApiError';
import VariablesValuesEditor from '../email/VariablesValuesEditor';

export interface TemplateBody {
  subject: string;
  html: string;
  ready: boolean;
  attachments: EmailAsset[];
}

interface Props {
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  /** Slug → value map pulled from the lead (venue/host), used to auto-fill. */
  variableValues: Record<string, string>;
  leadName: string;
  leadEmail: string;
  onChange: (body: TemplateBody) => void;
}

const PLACEHOLDER = /{{\s*([\w.]+)\s*}}/g;

/** Every {{ slug }} placeholder used in the text. */
function placeholders(text: string): string[] {
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  PLACEHOLDER.lastIndex = 0;
  while ((m = PLACEHOLDER.exec(text))) set.add(m[1]);
  return [...set];
}

const interpolate = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(PLACEHOLDER, (_m, k) => (vars[k] != null && vars[k] !== '' ? String(vars[k]) : ''));

/** Remove any placeholder that survived rendering so no raw slug is ever sent. */
const stripLeftover = (s: string) => s.replace(PLACEHOLDER, '');

/** Best value for a placeholder: lead value → template default → name/email heuristic. */
function seedValue(slug: string, sample: string | null | undefined, vv: Record<string, string>, name: string, email: string): string {
  if (vv[slug]) return vv[slug];
  if (sample) return sample;
  const k = slug.toLowerCase();
  if (/email/.test(k)) return email;
  if (/name/.test(k)) return name;
  return '';
}

/** Template send mode: pick a template, auto-fill EVERY placeholder from the lead, render. */
export default function TemplateBodyPicker({ entity, variableValues, leadName, leadEmail, onChange }: Readonly<Props>) {
  const client = useApolloClient();
  const { data, loading } = useQuery<{ emailTemplates: EmailTemplate[] }>(TEMPLATES, { fetchPolicy: 'cache-and-network' });
  const wanted = entity === 'VENUE_LEAD' ? 'VENUE' : 'HOST';
  const templates = useMemo(
    () => (data?.emailTemplates ?? []).filter((t) => t.is_active && (t.target === 'STATIC' || t.target === wanted)),
    [data, wanted]
  );

  const [selectedId, setSelectedId] = useState('');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<string[]>([]);
  const [html, setHtml] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const selected = templates.find((t) => t.template_id === selectedId) ?? null;

  const onPick = (id: string) => {
    setSelectedId(id);
    const tpl = templates.find((t) => t.template_id === id);
    if (!tpl) { setKeys([]); setVars({}); return; }
    // Cover EVERY placeholder in the MJML + subject — not just declared ones —
    // so a {{ venue_name }} the author forgot to "declare" still binds.
    const allKeys = [...new Set([...placeholders(tpl.mjml), ...placeholders(tpl.subject)])];
    const sampleOf = new Map(tpl.variables.map((v) => [v.key, v.sample]));
    setKeys(allKeys);
    setVars(Object.fromEntries(allKeys.map((k) => [k, seedValue(k, sampleOf.get(k), variableValues, leadName, leadEmail)])));
  };

  useEffect(() => {
    if (!selected) { onChange({ subject: '', html: '', ready: false, attachments: [] }); return; }
    const attachments = selected.attachments ?? [];
    const id = setTimeout(async () => {
      // Merge lead values under the edited values so every matching slug binds.
      const merged = { ...variableValues, ...vars };
      try {
        const res = await client.query({ query: RENDER, variables: { mjml: selected.mjml, vars: JSON.stringify(merged) }, fetchPolicy: 'network-only' });
        const renderedHtml = stripLeftover(res.data?.renderEmailTemplate?.html ?? '');
        setHtml(renderedHtml);
        setErrors(res.data?.renderEmailTemplate?.errors ?? []);
        onChange({ subject: interpolate(selected.subject, merged), html: renderedHtml, ready: !!renderedHtml, attachments });
      } catch (e) {
        setErrors([parseApiError(e)]);
        onChange({ subject: interpolate(selected.subject, merged), html: '', ready: false, attachments });
      }
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, vars]);

  const editorVars = useMemo(() => keys.map((k) => ({ key: k })), [keys]);

  return (
    <Stack spacing={1.5}>
      <TextField
        select
        size="small"
        label="Template"
        value={selectedId}
        onChange={(e) => onPick(e.target.value)}
        helperText={loading ? 'Loading templates…' : templates.length ? 'Pick a saved template.' : 'No active templates — create one under Email Templates.'}
        fullWidth
      >
        {templates.map((t) => <MenuItem key={t.template_id} value={t.template_id}>{t.name}</MenuItem>)}
      </TextField>

      {selected && (
        <>
          {keys.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary">Variable values (auto-filled from this lead — edit if needed)</Typography>
              <VariablesValuesEditor variables={editorVars} values={vars} onChange={setVars} />
            </>
          )}
          {selected.attachments.length > 0 && (
            <Typography variant="caption" color="text.secondary">{selected.attachments.length} attachment(s) will be sent.</Typography>
          )}
          {errors.length > 0 && <Alert severity="warning">{errors.slice(0, 2).join(' · ')}</Alert>}
          <Typography variant="caption" color="text.secondary">Preview</Typography>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', height: 220, bgcolor: '#f5f5f5' }}>
            <iframe title="template-preview" srcDoc={html} sandbox="" style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} />
          </Box>
        </>
      )}
    </Stack>
  );
}
