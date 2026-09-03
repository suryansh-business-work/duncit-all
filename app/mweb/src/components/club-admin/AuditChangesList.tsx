import { Stack, Typography } from '@mui/material';
import type { PodAuditChange } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  changes: PodAuditChange[];
  note: string;
  /** Lead with the "Changes (n)" heading and say so when there are none — the
   * detail dialog. The activity dialog keeps the rows bare under its card. */
  heading?: boolean;
}

/** The field-by-field diff of one recorded edit, and the note left with it. */
export default function AuditChangesList({ changes, note, heading = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const empty = t('clubAdmin.monitoring.emptyValue');
  const showNone = heading && changes.length === 0;

  return (
    <Stack spacing={0.5}>
      {heading && (
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('clubAdmin.monitoring.changesCount', { vars: { total: changes.length } })}
        </Typography>
      )}
      {showNone && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('clubAdmin.monitoring.noChanges')}
        </Typography>
      )}
      {changes.map((change) => (
        <Typography
          key={change.field}
          variant="caption"
          sx={{ color: 'text.secondary', wordBreak: 'break-word' }}
        >
          {change.field}: {change.from || empty} → {change.to || empty}
        </Typography>
      ))}
      {note && (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          <b>{t('clubAdmin.monitoring.note')}</b> {note}
        </Typography>
      )}
    </Stack>
  );
}
