import { memo, type ReactNode } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Paper, Stack, Typography, useTheme } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import LockIcon from '@mui/icons-material/Lock';
import LanIcon from '@mui/icons-material/Lan';
import { useTranslation } from '@duncit/app-settings';
import type { DomainNodeData, PortNodeData } from './port-map-graph';

export const NODE_WIDTH = 300;

function Card({ selected, muted, children, testId }: Readonly<{ selected: boolean; muted: boolean; children: ReactNode; testId: string }>) {
  return (
    <Paper
      elevation={selected ? 4 : 1}
      data-testid={testId}
      sx={{
        width: NODE_WIDTH,
        px: 1.5,
        py: 1,
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        borderStyle: muted ? 'dashed' : 'solid',
        bgcolor: 'background.paper',
      }}
    >
      {children}
    </Paper>
  );
}

/**
 * A domain nginx answers for. Module-scope and memoised — React Flow remounts
 * every node when a node type's identity changes.
 */
export const DomainNode = memo(function DomainNode({ data, selected }: NodeProps<Node<DomainNodeData, 'domain'>>) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Card selected={selected} muted={!data.enabled} testId={`port-map-domain-${data.domain}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <LanguageIcon fontSize="small" color="action" aria-hidden />
        <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: 600 }} title={data.domain}>
          {data.domain}
        </Typography>
        {data.tls && <LockIcon fontSize="small" color="success" titleAccess={t('tech.portMap.https')} />}
      </Stack>
      {!data.enabled && (
        <Typography variant="caption" color="text.secondary">
          {t('tech.portMap.siteDisabled')}
        </Typography>
      )}
      <Handle type="source" position={Position.Right} isConnectable={false} style={{ background: theme.palette.text.secondary }} />
    </Card>
  );
});

/** A local address nginx proxies to. */
export const PortNode = memo(function PortNode({ data, selected }: NodeProps<Node<PortNodeData, 'port'>>) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Card selected={selected} muted={false} testId={`port-map-port-${data.address}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} style={{ background: theme.palette.text.secondary }} />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <LanIcon fontSize="small" color="action" aria-hidden />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {data.port == null ? t('tech.portMap.noPort') : t('tech.portMap.portLabel', { vars: { port: String(data.port) } })}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap title={data.address}>
          {data.address}
        </Typography>
      </Stack>
    </Card>
  );
});

/** ONE stable map: a new identity per render would remount every node. */
export const NODE_TYPES = { domain: DomainNode, port: PortNode };
