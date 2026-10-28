import { Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { InfoRow, SectionCard } from '@duncit/ui';
import type { ManualCase } from '../shared/types';

interface Props {
  record: ManualCase;
}

/** When the case was filed and last changed, and by whom it was reported. */
export default function CaseMeta({ record }: Readonly<Props>) {
  const { t } = useTranslation();
  const format = useDateFormat();
  return (
    <SectionCard title={t('testsManual.detail.meta')}>
      <Stack spacing={1}>
        <InfoRow label={t('testsManual.field.reporter')} value={record.reporter?.name || t('testsManual.common.notSet')} />
        <InfoRow label={t('shell.common.created')} value={format.formatDateTime(record.created_at)} />
        <InfoRow label={t('shell.common.updated')} value={format.formatDateTime(record.updated_at)} />
      </Stack>
    </SectionCard>
  );
}
