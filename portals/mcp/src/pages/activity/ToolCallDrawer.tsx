import { useQuery } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { EM_DASH } from '@duncit/table';
import { InfoRow, QueryGuard } from '@duncit/ui';
import CodeBlock from '../../components/CodeBlock';
import DetailsDrawer from '../../components/DetailsDrawer';
import { prettyJson } from '../../lib/format';
import { guardModeLabel, TOOL_KIND, vocabularyLabel } from '../../lib/labels';
import { MCP_TOOL_CALL, type ToolCallData, type ToolCallRow } from './queries';

interface ToolCallDrawerProps {
  row: ToolCallRow | null;
  onClose: () => void;
}

/** One tool call in full: what it was sent, how it failed, and where it came from. */
export default function ToolCallDrawer({ row, onClose }: Readonly<ToolCallDrawerProps>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<ToolCallData, { id: string }>(MCP_TOOL_CALL, {
    variables: { id: row?.id ?? '' },
    skip: !row,
  });
  const call = data?.mcpToolCall;

  return (
    <DetailsDrawer open={row !== null} title={row?.tool ?? ''} subtitle={row?.reason ?? undefined} onClose={onClose}>
      <QueryGuard
        loading={loading && !call}
        error={error}
        errorText={t('mcp.activity.detailLoadFailed')}
        notFound={!loading && !error && !call}
        notFoundText={t('mcp.activity.detailNotFound')}
      >
        {() =>
          call ? (
            <Stack spacing={2}>
              <Stack spacing={1}>
                <InfoRow variant="inline" label={t('mcp.activity.detailKind')} value={vocabularyLabel(TOOL_KIND, call.kind, t)} />
                <InfoRow variant="inline" label={t('mcp.activity.detailGuard')} value={guardModeLabel(call.guard_mode, t)} />
                <InfoRow variant="inline" label={t('mcp.activity.detailErrorCode')} value={call.error_code ?? EM_DASH} />
                <InfoRow variant="inline" label={t('mcp.activity.detailErrorMessage')} value={call.error_message ?? EM_DASH} />
                <InfoRow variant="inline" label={t('mcp.activity.detailConnection')} value={call.connection_id ?? EM_DASH} />
                <InfoRow variant="inline" label={t('mcp.activity.detailIp')} value={call.ip ?? EM_DASH} />
                <InfoRow variant="inline" label={t('mcp.activity.detailUserAgent')} value={call.user_agent ?? EM_DASH} />
              </Stack>
              <Stack spacing={1}>
                <Typography variant="subtitle2" component="h3">
                  {t('mcp.activity.detailInjection')}
                </Typography>
                {call.injection_flags.length > 0 ? (
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {call.injection_flags.map((flag) => (
                      <Chip key={flag} label={flag} size="small" color="warning" variant="outlined" />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t('mcp.activity.detailNoInjection')}
                  </Typography>
                )}
              </Stack>
              <Stack spacing={1}>
                <Typography variant="subtitle2" component="h3">
                  {t('mcp.activity.detailArgs')}
                </Typography>
                <CodeBlock code={prettyJson(call.args_preview)} copyLabel={t('mcp.activity.copyArgs')} />
              </Stack>
            </Stack>
          ) : null
        }
      </QueryGuard>
    </DetailsDrawer>
  );
}
