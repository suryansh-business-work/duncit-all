import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import InfoList from './InfoList';
import { formatBytes, formatDate, formatDateTime, formatUptime } from './format';
import type { BytesInfo, ServerInfo } from './queries';
import { useTranslation } from '@duncit/app-settings';

function Panel({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            mb: 1
          }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function ServerInfoDetails({ info }: Readonly<{ info: ServerInfo }>) {
  const { t } = useTranslation();
  const { os, cpu, ssl, network } = info;
  const usedOfTotal = (bytes: BytesInfo) =>
    t('tech.server.usedOfTotal', {
      vars: { used: formatBytes(bytes.usedBytes), total: formatBytes(bytes.totalBytes), pct: `${bytes.usagePercent}%` },
    });
  const external = network.filter((n) => !n.internal && n.family === 'IPv4');

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      <Panel title={t('tech.server.operatingSystem')}>
        <InfoList
          rows={[
            { label: t('tech.server.hostname'), value: os.hostname },
            { label: 'OS', value: `${os.distro} ${os.release}` },
            { label: t('shell.common.type'), value: os.type },
            { label: t('tech.server.architecture'), value: os.arch },
            { label: t('tech.server.kernelUptime'), value: formatUptime(os.kernelUptimeSeconds) },
            { label: t('tech.server.apiProcessUptime'), value: formatUptime(os.processUptimeSeconds) },
            { label: 'Node.js', value: os.nodeVersion },
            { label: t('tech.server.sshPort'), value: info.sshPort },
            { label: t('tech.server.collected'), value: formatDateTime(info.collectedAt) },
          ]}
        />
      </Panel>

      <Panel title="CPU">
        <InfoList
          rows={[
            { label: t('tech.server.model'), value: cpu.model },
            { label: t('tech.server.cores'), value: cpu.cores },
            { label: t('tech.server.clock'), value: cpu.speedMhz ? `${(cpu.speedMhz / 1000).toFixed(2)} GHz` : '—' },
            { label: t('tech.server.usage'), value: `${cpu.usagePercent}%` },
            { label: t('tech.server.load1m5m15m'), value: `${cpu.loadAvg1} / ${cpu.loadAvg5} / ${cpu.loadAvg15}` },
          ]}
        />
      </Panel>

      <Panel title={t('tech.server.memoryStorage')}>
        <InfoList
          rows={[
            { label: t('tech.server.memoryUsed'), value: usedOfTotal(info.memory) },
            { label: t('tech.server.memoryAvailable'), value: formatBytes(info.memory.freeBytes) },
            {
              label: t('tech.server.swapUsed'),
              value: info.swap.totalBytes > 0 ? usedOfTotal(info.swap) : t('tech.server.swapNone'),
            },
            { label: t('tech.server.diskMount'), value: info.disk.path },
            { label: t('tech.server.diskUsed'), value: usedOfTotal(info.disk) },
            { label: t('tech.server.diskFree'), value: formatBytes(info.disk.freeBytes) },
            { label: t('tech.server.inodesUsed'), value: `${info.disk.inodeUsagePercent}%` },
          ]}
        />
      </Panel>

      <Panel title={t('tech.server.sslCertificate')}>
        {ssl && !ssl.error ? (
          <InfoList
            rows={[
              { label: t('tech.common.host'), value: ssl.host },
              {
                label: t('shell.common.status'),
                value: (
                  <Chip
                    size="small"
                    color={ssl.valid ? 'success' : 'error'}
                    label={ssl.valid ? 'Valid & trusted' : 'Not trusted'}
                  />
                ),
              },
              { label: t('tech.server.issuer'), value: ssl.issuer ?? '—' },
              { label: t('tech.common.subject'), value: ssl.subject ?? '—' },
              { label: t('tech.server.protocol'), value: ssl.protocol ?? '—' },
              { label: t('tech.server.validFrom'), value: formatDate(ssl.validFrom) },
              {
                label: t('tech.server.expires'),
                value:
                  ssl.daysRemaining === null
                    ? formatDate(ssl.validTo)
                    : `${formatDate(ssl.validTo)} · ${ssl.daysRemaining} days left`,
              },
            ]}
          />
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {ssl?.error ?? 'No certificate information available.'}
          </Typography>
        )}
      </Panel>

      <Panel title={t('tech.common.network')}>
        {external.length ? (
          <InfoList rows={external.map((n) => ({ label: n.name, value: n.address }))} />
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            No external network interfaces detected.
          </Typography>
        )}
      </Panel>
    </Box>
  );
}
