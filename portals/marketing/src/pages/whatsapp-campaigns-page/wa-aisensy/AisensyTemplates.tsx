import { useQuery } from '@apollo/client';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { AISENSY_TEMPLATES, type AisensyTemplate } from '../queries';
import AisensySection from './AisensySection';

const statusColor = (status: string) =>
  status.toUpperCase() === 'APPROVED' ? 'success' : 'default';

/** One template card. Hoisted so it isn't redefined each render (S6478). */
function TemplateRow({ template }: Readonly<{ template: AisensyTemplate }>) {
  const paramsLabel =
    template.param_count === 1 ? '1 parameter' : `${template.param_count} parameters`;
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ py: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography fontWeight={800} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {template.name}
          </Typography>
          {template.language && <Chip size="small" label={template.language} />}
          {template.category && <Chip size="small" label={template.category} />}
          {template.status && (
            <Chip size="small" color={statusColor(template.status)} label={template.status} />
          )}
        </Stack>
        {template.body && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.75, whiteSpace: 'pre-wrap' }}
          >
            {template.body}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {paramsLabel} — a send must fill exactly that many
        </Typography>
      </CardContent>
    </Card>
  );
}

/** The WhatsApp templates AiSensy has for this project, read live. */
export default function AisensyTemplates() {
  const { data, loading, error } = useQuery<{
    aisensyProjectConfigured: boolean;
    aisensyTemplates: AisensyTemplate[];
  }>(AISENSY_TEMPLATES, { fetchPolicy: 'cache-and-network', errorPolicy: 'all' });
  const templates = data?.aisensyTemplates ?? [];

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        The approved message bodies behind your campaigns — including how many {'{{n}}'} variables
        each one expects.
      </Typography>
      <AisensySection
        configured={data?.aisensyProjectConfigured !== false}
        loading={loading}
        error={error}
        count={templates.length}
        emptyText="AiSensy returned no templates for this project."
      >
        <Stack spacing={1}>
          {templates.map((template) => (
            <TemplateRow key={`${template.name}-${template.language}`} template={template} />
          ))}
        </Stack>
      </AisensySection>
    </Stack>
  );
}
