import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/status.ts", [
  [
    "      noCertificate: 'No certificate',",
    "      noCertificate: 'No certificate',\n      healthUnavailable: 'Health details unavailable.',\n      memory: 'Memory',\n      ssl: 'SSL',\n      sslTrusted: 'Valid & trusted',\n      sslUntrusted: 'Not trusted',\n      sslExpiry: '{date} · {days} days left',\n      unreachable: 'Unreachable',",
  ],
]);

apply("website/status-website/src/components/service-details-dialog/HealthSection.tsx", [
  [
    "import { formatBytes, formatDuration } from '../../utils/format';",
    "import { useTranslation } from '../../i18n';\nimport { formatBytes, formatDuration } from '../../utils/format';",
  ],
  [
    "export default function HealthSection({ health, failed }: Readonly<HealthSectionProps>) {\n  if (failed) {\n    return (\n      <Typography variant=\"body2\" color=\"text.secondary\" py={1}>\n        Health details unavailable.\n      </Typography>\n    );\n  }",
    "export default function HealthSection({ health, failed }: Readonly<HealthSectionProps>) {\n  const { t } = useTranslation();\n  if (failed) {\n    return (\n      <Typography variant=\"body2\" color=\"text.secondary\" py={1}>\n        {t('status.detail.healthUnavailable')}\n      </Typography>\n    );\n  }",
  ],
  [
    "      <DetailRow label=\"Status\" value={<StatusPill ok={health.status === 'ok'} label={health.status} />} />\n      <DetailRow label=\"Database\" value={<StatusPill ok={dbOk} label={health.checks.database} />} />\n      <DetailRow label=\"Version\" value={health.version} />\n      <DetailRow label=\"Environment\" value={health.environment} />\n      <DetailRow label=\"Process uptime\" value={formatDuration(health.uptime.processSeconds)} />\n      <DetailRow label=\"System uptime\" value={formatDuration(health.uptime.systemSeconds)} />\n      <DetailRow label=\"Node\" value={health.node} />\n      <DetailRow label=\"Platform\" value={health.platform} />\n      <DetailRow label=\"Hostname\" value={health.hostname} />",
    "      <DetailRow\n        label={t('status.detail.status')}\n        value={<StatusPill ok={health.status === 'ok'} label={health.status} />}\n      />\n      <DetailRow\n        label={t('status.detail.database')}\n        value={<StatusPill ok={dbOk} label={health.checks.database} />}\n      />\n      <DetailRow label={t('status.detail.version')} value={health.version} />\n      <DetailRow label={t('status.detail.environment')} value={health.environment} />\n      <DetailRow\n        label={t('status.detail.processUptime')}\n        value={formatDuration(health.uptime.processSeconds)}\n      />\n      <DetailRow\n        label={t('status.detail.systemUptime')}\n        value={formatDuration(health.uptime.systemSeconds)}\n      />\n      <DetailRow label={t('status.detail.node')} value={health.node} />\n      <DetailRow label={t('status.detail.platform')} value={health.platform} />\n      <DetailRow label={t('status.detail.hostname')} value={health.hostname} />",
  ],
  [
    "          <Typography variant=\"body2\" fontWeight={700} color=\"text.secondary\">\n            Memory\n          </Typography>",
    "          <Typography variant=\"body2\" fontWeight={700} color=\"text.secondary\">\n            {t('status.detail.memory')}\n          </Typography>",
  ],
]);

apply("website/status-website/src/components/service-details-dialog/ProbeSection.tsx", [
  [
    "import { formatDate } from '../../utils/format';",
    "import { useTranslation } from '../../i18n';\nimport { formatDate } from '../../utils/format';",
  ],
  [
    "function SslRows({ ssl }: Readonly<{ ssl: SslInfo }>) {\n  const expiresOn = formatDate(ssl.validTo);\n  const expiry =\n    ssl.daysRemaining === null ? expiresOn : `${expiresOn} · ${ssl.daysRemaining} days left`;\n  const trustLabel = ssl.authorized ? 'Valid & trusted' : 'Not trusted';\n  return (\n    <>\n      <DetailRow label=\"SSL\" value={<StatusPill ok={ssl.authorized} label={trustLabel} />} />\n      <DetailRow label=\"Issuer\" value={ssl.issuer ?? '—'} />\n      <DetailRow label=\"Subject\" value={ssl.subject ?? '—'} />\n      <DetailRow label=\"Protocol\" value={ssl.protocol ?? '—'} />\n      <DetailRow label=\"Valid from\" value={formatDate(ssl.validFrom)} />\n      <DetailRow label=\"Expires\" value={expiry} />\n    </>\n  );\n}",
    "function SslRows({ ssl }: Readonly<{ ssl: SslInfo }>) {\n  const { t } = useTranslation();\n  const expiresOn = formatDate(ssl.validTo);\n  const expiry =\n    ssl.daysRemaining === null\n      ? expiresOn\n      : t('status.detail.sslExpiry', { vars: { date: expiresOn, days: ssl.daysRemaining } });\n  const trustLabel = ssl.authorized\n    ? t('status.detail.sslTrusted')\n    : t('status.detail.sslUntrusted');\n  return (\n    <>\n      <DetailRow\n        label={t('status.detail.ssl')}\n        value={<StatusPill ok={ssl.authorized} label={trustLabel} />}\n      />\n      <DetailRow label={t('status.detail.issuer')} value={ssl.issuer ?? '—'} />\n      <DetailRow label={t('status.detail.subject')} value={ssl.subject ?? '—'} />\n      <DetailRow label={t('status.detail.protocol')} value={ssl.protocol ?? '—'} />\n      <DetailRow label={t('status.detail.validFrom')} value={formatDate(ssl.validFrom)} />\n      <DetailRow label={t('status.detail.expires')} value={expiry} />\n    </>\n  );\n}",
  ],
  [
    "export default function ProbeSection({ probe, error }: Readonly<ProbeSectionProps>) {\n  if (error) return <Alert severity=\"error\">{error}</Alert>;",
    "export default function ProbeSection({ probe, error }: Readonly<ProbeSectionProps>) {\n  const { t } = useTranslation();\n  if (error) return <Alert severity=\"error\">{error}</Alert>;",
  ],
  [
    "      ? (probe.error ?? 'Unreachable')",
    "      ? (probe.error ?? t('status.detail.unreachable'))",
  ],
  [
    "      <DetailRow label=\"HTTP status\" value={<StatusPill ok={probe.ok} label={codeLabel} />} />\n      {probe.ssl ? (\n        <SslRows ssl={probe.ssl} />\n      ) : (\n        <DetailRow label=\"SSL\" value={<StatusPill ok={false} label=\"No certificate\" />} />\n      )}",
    "      <DetailRow\n        label={t('status.detail.httpStatus')}\n        value={<StatusPill ok={probe.ok} label={codeLabel} />}\n      />\n      {probe.ssl ? (\n        <SslRows ssl={probe.ssl} />\n      ) : (\n        <DetailRow\n          label={t('status.detail.ssl')}\n          value={<StatusPill ok={false} label={t('status.detail.noCertificate')} />}\n        />\n      )}",
  ],
]);
