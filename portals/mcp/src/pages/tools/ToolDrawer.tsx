import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { InfoRow, QueryGuard } from '@duncit/ui';
import CodeBlock from '../../components/CodeBlock';
import CopyButton from '../../components/CopyButton';
import DetailsDrawer from '../../components/DetailsDrawer';
import { prettyJson } from '../../lib/format';
import { TOOL_KIND, TOOL_RISK, vocabularyLabel } from '../../lib/labels';
import { MCP_TOOL_DETAIL, type ToolDetailData, type ToolRow } from './queries';

interface ToolDrawerProps {
  tool: ToolRow | null;
  onClose: () => void;
}

/** One tool in full: what it does, where it is offered, and the parameters it takes. */
export default function ToolDrawer({ tool, onClose }: Readonly<ToolDrawerProps>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<ToolDetailData, { search: string }>(MCP_TOOL_DETAIL, {
    variables: { search: tool?.name ?? '' },
    skip: !tool,
  });
  const detail = data?.mcpCatalog.tools.find((entry) => entry.name === tool?.name);
  const yesNo = (value: boolean) => (value ? t('shell.common.yes') : t('shell.common.no'));

  return (
    <DetailsDrawer open={tool !== null} title={tool?.title ?? ''} subtitle={tool?.name} onClose={onClose}>
      {tool ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" component="code" sx={{ flex: 1, wordBreak: 'break-all' }}>
              {tool.name}
            </Typography>
            <CopyButton text={tool.name} label={t('mcp.tools.copyName')} doneMessage={t('mcp.tools.nameCopied')} />
          </Stack>
          {tool.available ? null : (
            <Alert severity="info">{tool.unavailable_reason ?? t('mcp.tools.unavailable')}</Alert>
          )}
          <Stack spacing={1}>
            <InfoRow variant="inline" label={t('mcp.tools.columnCategory')} value={tool.category_label} />
            <InfoRow variant="inline" label={t('mcp.tools.columnRisk')} value={vocabularyLabel(TOOL_RISK, tool.risk, t)} />
            <InfoRow variant="inline" label={t('mcp.tools.columnConfirm')} value={yesNo(tool.needs_confirmation)} />
          </Stack>
          <QueryGuard
            loading={loading && !detail}
            error={error}
            errorText={t('mcp.tools.detailLoadFailed')}
            notFound={!loading && !error && !detail}
            notFoundText={t('mcp.tools.detailNotFound')}
          >
            {() =>
              detail ? (
                <Stack spacing={2}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {detail.description}
                  </Typography>
                  <Stack spacing={1}>
                    <InfoRow variant="inline" label={t('mcp.tools.detailKind')} value={vocabularyLabel(TOOL_KIND, detail.kind, t)} />
                    <InfoRow variant="inline" label={t('mcp.tools.detailEndpoints')} value={detail.endpoints.join(', ')} />
                    <InfoRow variant="inline" label={t('mcp.tools.detailOutside')} value={yesNo(detail.reaches_outside)} />
                  </Stack>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" component="h3">
                      {t('mcp.tools.detailSchema')}
                    </Typography>
                    <CodeBlock code={prettyJson(detail.input_schema)} copyLabel={t('mcp.tools.copySchema')} />
                  </Stack>
                </Stack>
              ) : null
            }
          </QueryGuard>
        </Stack>
      ) : null}
    </DetailsDrawer>
  );
}
