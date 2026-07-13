import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import InfoList from './InfoList';
import { formatDate, formatDateTime, formatUptime } from './format';
import type { ServerInfo } from './queries';

function Panel({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function ServerInfoDetails({ info }: Readonly<{ info: ServerInfo }>) {
  const { os, cpu, ssl, network } = info;
  const external = network.filter((n) => !n.internal && n.family === 'IPv4');

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <Panel title="Operating system">
        <InfoList
          rows={[
            { label: 'Hostname', value: os.hostname },
            { label: 'OS', value: `${os.distro} ${os.release}` },
            { label: 'Type', value: os.type },
            { label: 'Architecture', value: os.arch },
            { label: 'Kernel uptime', value: formatUptime(os.kernelUptimeSeconds) },
            { label: 'API process uptime', value: formatUptime(os.processUptimeSeconds) },
            { label: 'Node.js', value: os.nodeVersion },
            { label: 'SSH port', value: info.sshPort },
            { label: 'Collected', value: formatDateTime(info.collectedAt) },
          ]}
        />
      </Panel>

      <Panel title="CPU">
        <InfoList
          rows={[
            { label: 'Model', value: cpu.model },
            { label: 'Cores', value: cpu.cores },
            { label: 'Clock', value: cpu.speedMhz ? `${(cpu.speedMhz / 1000).toFixed(2)} GHz` : '—' },
            { label: 'Usage', value: `${cpu.usagePercent}%` },
            { label: 'Load (1m / 5m / 15m)', value: `${cpu.loadAvg1} / ${cpu.loadAvg5} / ${cpu.loadAvg15}` },
          ]}
        />
      </Panel>

      <Panel title="SSL certificate">
        {ssl && !ssl.error ? (
          <InfoList
            rows={[
              { label: 'Host', value: ssl.host },
              {
                label: 'Status',
                value: (
                  <Chip
                    size="small"
                    color={ssl.valid ? 'success' : 'error'}
                    label={ssl.valid ? 'Valid & trusted' : 'Not trusted'}
                  />
                ),
              },
              { label: 'Issuer', value: ssl.issuer ?? '—' },
              { label: 'Subject', value: ssl.subject ?? '—' },
              { label: 'Protocol', value: ssl.protocol ?? '—' },
              { label: 'Valid from', value: formatDate(ssl.validFrom) },
              {
                label: 'Expires',
                value:
                  ssl.daysRemaining === null
                    ? formatDate(ssl.validTo)
                    : `${formatDate(ssl.validTo)} · ${ssl.daysRemaining} days left`,
              },
            ]}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {ssl?.error ?? 'No certificate information available.'}
          </Typography>
        )}
      </Panel>

      <Panel title="Network">
        {external.length ? (
          <InfoList rows={external.map((n) => ({ label: n.name, value: n.address }))} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No external network interfaces detected.
          </Typography>
        )}
      </Panel>
    </Box>
  );
}
