import type { ReactElement } from 'react';
import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
// The outlined-theme Error glyph. Named `ErrorOutlined` rather than
// `ErrorOutline`, which @mui/icons-material v9 no longer ships.
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import BlockIcon from '@mui/icons-material/Block';
import { useTranslation } from '@duncit/app-settings';
import { formatDateTime } from '../server/format';
import type { TemplateUsage } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Email Logs, already narrowed to this template — and to one status when the
 * chip that links here counts only one.
 *
 * The status values are the log's own (`SENT` / `FAILED` / `SKIPPED`), so the
 * chips a template links to are the same chips the logs page draws.
 */
export function logsHref(slug: string, status?: string): string {
  const params = new URLSearchParams({ template: slug });
  if (status) params.set('status', status);
  return `/emails/logs?${params.toString()}`;
}

/**
 * The line under the counts: when this template was last really used.
 *
 * Three states, not two. A template that has attempted forty sends and landed
 * none of them is not "never used" — it is broken, and rounding it to the same
 * words as an unused template hides the one thing worth knowing about it.
 */
export function lastUsedLabel(t: Translate, usage: TemplateUsage | null): string {
  if (!usage || usage.total === 0) return t('tech.emailTemplates.neverUsed');
  if (usage.sent > 0) {
    return t('tech.emailTemplates.lastSent', {
      vars: { when: formatDateTime(usage.last_sent_at) },
    });
  }
  return t('tech.emailTemplates.neverSentLastAttempt', {
    vars: { when: formatDateTime(usage.last_attempt_at) },
  });
}

/**
 * One count, as a link into the log that produced it.
 *
 * A real anchor rather than an onClick: an operator comparing two templates
 * opens both in tabs, and a middle click on a div does nothing.
 */
function UsageChip({
  to,
  label,
  purpose,
  color,
  icon,
}: Readonly<{
  to: string;
  label: string;
  /**
   * What following this link does, naming the count it sits on.
   *
   * MUI writes a string tooltip title onto the child as `aria-label`, so this
   * IS the link's accessible name — one generic sentence across all three
   * chips would leave a screen reader with three links called the same thing.
   */
  purpose: string;
  color: 'success' | 'error' | 'warning' | 'default';
  icon: ReactElement;
}>) {
  return (
    <Tooltip title={purpose}>
      <Chip
        size="small"
        clickable
        component={RouterLink}
        to={to}
        icon={icon}
        color={color}
        variant={color === 'default' ? 'outlined' : 'filled'}
        label={label}
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      />
    </Tooltip>
  );
}

interface Props {
  /** The slug the log rows carry — not the editable name. */
  slug: string;
  /** Null while the roll-up is still loading, or for a template with no rows. */
  usage: TemplateUsage | null;
}

/**
 * How often this template has actually gone out, and when it last did.
 *
 * Every number here is a link into Email Logs filtered to this template, so the
 * count and the rows behind it can be checked against each other in one click —
 * which is the only reason to trust a count at all.
 */
export default function TemplateUsageStrip({ slug, usage }: Readonly<Props>) {
  const { t } = useTranslation();
  const sent = usage?.sent ?? 0;
  const failed = usage?.failed ?? 0;
  const skipped = usage?.skipped ?? 0;
  const purpose = (label: string) => t('tech.emailTemplates.openInEmailLogs', { vars: { label } });
  const sentLabel = t('tech.emailTemplates.sentCount', { vars: { count: sent } });
  const failedLabel = t('tech.emailTemplates.failedCount', { vars: { count: failed } });
  const skippedLabel = t('tech.emailTemplates.skippedCount', { vars: { count: skipped } });

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "center",
        flexWrap: "wrap"
      }}>
      <UsageChip
        to={logsHref(slug, 'SENT')}
        label={sentLabel}
        purpose={purpose(sentLabel)}
        color={sent > 0 ? 'success' : 'default'}
        icon={<MarkEmailReadIcon />}
      />
      {failed > 0 && (
        <UsageChip
          to={logsHref(slug, 'FAILED')}
          label={failedLabel}
          purpose={purpose(failedLabel)}
          color="error"
          icon={<ErrorOutlinedIcon />}
        />
      )}
      {skipped > 0 && (
        <UsageChip
          to={logsHref(slug, 'SKIPPED')}
          label={skippedLabel}
          purpose={purpose(skippedLabel)}
          color="warning"
          icon={<BlockIcon />}
        />
      )}
      <Tooltip title={t('tech.emailTemplates.countedFromEmailLogs')}>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {lastUsedLabel(t, usage)}
        </Typography>
      </Tooltip>
    </Stack>
  );
}
