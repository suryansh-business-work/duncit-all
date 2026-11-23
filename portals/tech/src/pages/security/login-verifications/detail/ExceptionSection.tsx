import { SectionCard, StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import Facts from '../../Facts';
import { REQUEST_STATUS_COLOR, REQUEST_STATUS_KEY, enumLabel, timeOf } from '../../labels';
import type { LogDetail } from '../queries';

/** The request that stood in for a location, and what the administrator who decided it said. */
export default function ExceptionSection({ exception }: Readonly<{ exception: NonNullable<LogDetail['exception']> }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('tech.loginVerifications.exception.title')}>
      <Facts
        items={[
          {
            label: t('shell.common.status'),
            value: (
              <StatusChip
                status={exception.status}
                colorMap={REQUEST_STATUS_COLOR}
                label={enumLabel(t, REQUEST_STATUS_KEY, exception.status)}
              />
            ),
          },
          { label: t('tech.loginVerifications.exception.decidedBy'), value: exception.decided_by_name },
          { label: t('tech.loginVerifications.exception.decidedAt'), value: timeOf(exception.decided_at) },
          { label: t('tech.loginVerifications.exception.reason'), value: exception.reason, wide: true },
          { label: t('tech.loginVerifications.exception.note'), value: exception.decision_note, wide: true },
        ]}
      />
    </SectionCard>
  );
}
